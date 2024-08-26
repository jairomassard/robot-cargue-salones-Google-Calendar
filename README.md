# robot-cargue-salones-Google-Calendar
Programa para automatizar el cargue de información de Clases y próximas clases en etiquetas informativas ESL

El programa esta elaborado en Node.JS

Este programa tiene por objetivo automatizar la obtencion de información de las clases que se dictan en un establecimiento educativo o de los eventos que se ofrecen en salones de eventos, alimentando y mostrando en pantallas informativas de papel electronico ESL.  En el calendario de google se programan diferentes salones o salas de eventos. cada sala o salon tiene su propio calendario bajo una misma cuenta.   

Se conecta con la API de google Calendars para extraer lña información de eventos en el calendario y se conecta con API al software cloud del fabricante de las pantallas informativa ESL, lugar donde se configuran los campos de la BD que se utilizará, se diseña la plantilla de presentación de la información en las pantallas y se administran y gestionan los equipos y se verifica el funcionamiento del HW.

Cada vez que se ejecuta el programa verifica el calendario, toma la información que esta vigente y por venir (2 eventos siguientes) sobre eventos en el calendario, y los envia al API del fabricante de las etiquetas ESL para que luego este ultimo se encargue de mandar a cargar la información recibida en las pantallas de los salones a los que se le pidio consultar y tomar la información.

En la carpeta configuraciones debe ser ubicado el archivo json que genera google calendar para poder conectarse con el calendario. tiene n estructura algo asi en su nombre cogent-sunspot-404022-101e58021481.json    El programa consulta ese archivo y junto con otros parametros que estan en el archivo config.json realiza la tarea antes descrita.

