# Modo oscuro

## Objetivo
Agregar un selector de tema claro/oscuro que funcione tanto en el ingreso como en los modos chef y anfitrión.

## Cambios
- Crear un control de tema accesible con íconos de sol y luna.
- Recordar la elección en este navegador y usar la preferencia del dispositivo la primera vez.
- Aplicar la paleta oscura existente a toda la interfaz, incluyendo el fondo decorativo.
- Ubicar el control en el ingreso y en la cabecera de las vistas internas.
- Comprobar visualmente ambos temas y en pantalla móvil.

## Detalles técnicos
- El tema se aplicará mediante la clase `dark` en el documento.
- La preferencia se guardará localmente para evitar que cambie al recargar.
- Se reutilizarán los colores semánticos y el componente de botón del proyecto.
