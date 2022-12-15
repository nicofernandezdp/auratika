<?php
#nombre = $_POST['nombre'];
#email = $_POST['email'];
#telefono = $_POST['telefono'];
#mensaje = $_POST['mensaje'];

$destinatario = "info@auratika.com";
$asunto = "Mensaje desde la web";

$carta = "De: $nombre \n";
$carta = "Correo: $email \n";
$carta = "Teléfono: $telefono \n";
$carta = "Mensaje: $mensaje"


mail($detinatario, $asunto, $carta);
?>