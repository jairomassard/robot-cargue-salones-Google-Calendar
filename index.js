const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');
const md5 = require('md5');
const fetch = require('node-fetch');
const moment = require('moment');

// Cargar la configuración desde el archivo JSON
const configPath = 'C:/Prog_Cargue_Salones/configuraciones/config.json'; // Asegúrate de que la ruta sea relativa al ejecutable o absoluta
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

const rutaDirectorioLog = config.logDirectoryPath;
const rutaArchivoLog = `${rutaDirectorioLog}/log.txt`;

function crearLog(contenido) {
    // Verificar si existe el directorio, crearlo si no existe
    if (!fs.existsSync(rutaDirectorioLog)) {
        fs.mkdirSync(rutaDirectorioLog, { recursive: true });
    }

    fs.appendFile(rutaArchivoLog, contenido + '\n', 'utf8', (err) => {
        if (err) {
            console.error('Error al escribir en el archivo de log:', err);
            return;
        }
        console.log('Log guardado!');
    });
}

function EnviarYalaInfo(transactionObj) {
    // Cálculo del formato de fecha para el HASH1
    const fecha = moment().add(13, 'hours');
    const formatofecha = fecha.format('YYYY-MM-DD');
    const hash1 = md5(config.merchantKey + formatofecha);
    console.log(hash1);

    const myHeaders = {
        'veryText': hash1,
        'merchantCode': config.merchantCode,
        'type': '1',
        'Content-Type': 'application/json'
    };

    const raw = JSON.stringify([transactionObj]);

    const requestOptions = {
        method: 'POST',
        headers: myHeaders,
        body: raw,
        redirect: 'follow',
    };

    fetch('https://sg.yalabi.net/open/saveOrGoods', requestOptions)
        .then((response) => response.json())
        .then((result) => {
            console.log(result);
            const estado = result.code === 200 ? 'Éxito' : 'Error';
            const mensaje = estado === 'Éxito' ? 'Registro enviado a las Etiquetas con éxito' : 'Hubo un problema al enviar el registro a las Etiquetas. Código de error: ' + result.code;
            console.log(mensaje);
            crearLog(`${JSON.stringify(transactionObj)};${estado};${moment().toLocaleString()}`);
        })
        .catch((error) => {
            console.log('Error al enviar el registro:', error);
            crearLog(`${JSON.stringify(transactionObj)};Error;${moment().toLocaleString()}`);
        });
}

// Carga las credenciales desde el archivo que descargaste al crear las credenciales en Google Cloud Platform
const KEYFILEPATH = config.keyFilePath;
const SCOPES = ['https://www.googleapis.com/auth/calendar.readonly'];

const auth = new google.auth.GoogleAuth({
    keyFile: KEYFILEPATH,
    scopes: SCOPES,
});

const calendar = google.calendar({ version: 'v3', auth });

// IDs de los calendarios que se consultan y asocian
const calendarIds = config.calendarIds;

// Definir 'now' en el ámbito superior
const now = moment();

// Función para formatear la fecha y la hora
const formatDate = (date) => moment(date).format('YYYY-MM-DD');
const formatTime = (time) => moment(time).format('HH:mm');

// Función para procesar los eventos y crear el objeto de transacción
const procesarEventos = async (events, salonName) => {
    // Ordenar los eventos por fecha de inicio
    const sortedEvents = events.sort((a, b) => moment(a.start.dateTime).diff(moment(b.start.dateTime)));

    // Encontrar el evento actual
    const eventoActual = sortedEvents.find(event => now.isBetween(moment(event.start.dateTime), moment(event.end.dateTime)));

    // Encontrar el primer y segundo evento próximo
    const proximoEvento = sortedEvents.find(event => moment(event.start.dateTime).isAfter(now));
    const segundoProximoEvento = sortedEvents.find(event => moment(event.start.dateTime).isSameOrAfter(moment(proximoEvento.end.dateTime)));


    // Determinar si el salón está actualmente ocupado y asignar los eventos correspondientes
    const isSalonOcupado = eventoActual !== undefined;

    // Crear el objeto de transacción
    const transactionObj = {
        itemName: salonName,
        itemBarCode: salonName,
        merchantGoodsId: salonName,
        merchantGoodsCategoryId: salonName,
        categoryName: 'Salones de Clase',
        reservedField1: isSalonOcupado ? formatDate(eventoActual.start.dateTime) : '',
        reservedField2: isSalonOcupado ? formatTime(eventoActual.start.dateTime) : '',
        reservedField3: isSalonOcupado ? formatTime(eventoActual.end.dateTime) : '',
        reservedField4: isSalonOcupado ? eventoActual.summary : '',
        reservedField5: isSalonOcupado && eventoActual.description ? eventoActual.description : '',
        reservedField6: isSalonOcupado ? 'OCUPADO' : 'DISPONIBLE',
        reservedField7: proximoEvento ? formatDate(proximoEvento.start.dateTime) : '',
        reservedField8: proximoEvento ? formatTime(proximoEvento.start.dateTime) : '',
        reservedField9: proximoEvento ? formatTime(proximoEvento.end.dateTime) : '',
        reservedField10: proximoEvento ? proximoEvento.summary : '',
        reservedField11: segundoProximoEvento ? formatDate(segundoProximoEvento.start.dateTime) : '',
        reservedField12: segundoProximoEvento ? formatTime(segundoProximoEvento.start.dateTime) : '',
        reservedField13: segundoProximoEvento ? formatTime(segundoProximoEvento.end.dateTime) : '',
        reservedField14: segundoProximoEvento ? segundoProximoEvento.summary : '',
    };

    // Enviar la información al servicio de terceros para el primer evento próximo
    await EnviarYalaInfo(transactionObj);
    console.log(transactionObj);
};

// Función asíncrona para procesar cada calendario
const procesarCalendarios = async () => {
    for (const [salonName, calendarId] of Object.entries(calendarIds)) {
        try {
            const res = await calendar.events.list({
                calendarId: calendarId,
                timeMin: (new Date()).toISOString(),
                maxResults: config.maxResults, // Ajustado para traer más eventos y tener un margen de maniobra. Utiliza el valor del archivo de configuración
                singleEvents: true,
                orderBy: 'startTime',
            });

            const events = res.data.items;
            if (events.length) {
                // Filtrar eventos que aún no han terminado
                const upcomingEvents = events.filter(event => moment(event.end.dateTime).isAfter(now));
                await procesarEventos(upcomingEvents, salonName);
            } else {
                console.log(`No se encontraron eventos próximos en el calendario: ${salonName}`);
                await procesarEventos([], salonName); // Llama a procesarEventos con un arreglo vacío
            }
        } catch (err) {
            console.log('La API devolvió un error: ' + err);
        }
    }
};

// Iniciar el procesamiento de los calendarios
procesarCalendarios();