/*
 * Contenido de las páginas de la web de VANESEV (T-34, T-35 y T-36).
 * Cada página de solución y de oficio comparte plantilla; aquí solo vive el texto.
 * «pronto» marca lo planificado que aún no funciona en los salones (G-053).
 */

export type IconoWeb =
  | 'qr' | 'calendario' | 'whatsapp' | 'premio' | 'equipo' | 'candado' | 'regalo' | 'porcentaje' | 'cartera'
  | 'campana' | 'paleta' | 'reloj' | 'impresora' | 'movil' | 'escudo' | 'grafica' | 'etiqueta' | 'corazon' | 'tijeras' | 'ojo' | 'mano' | 'gota';

export interface Punto { icono: IconoWeb; titulo: string; texto: string; pronto?: boolean }
export interface Paso { titulo: string; texto: string }

export interface PaginaContenido {
  ruta: string;
  menu: string;
  etiqueta: string;
  titulo: string;
  acento: string;
  subtitulo: string;
  foto: string;
  fotoBanda: string;
  dolores: string[];
  pasos: Paso[];
  incluye: Punto[];
  frase: string;
  preguntas: [string, string][];
  meta: string;
}

export const FUNCIONES: PaginaContenido[] = [
  {
    ruta: '/funciones/carta-y-reservas',
    menu: 'Carta y reservas',
    etiqueta: 'Carta y reservas',
    titulo: 'Tu carta reserva sola,',
    acento: 'mientras tú creas.',
    subtitulo: 'Tus servicios con tus fotos y tus precios en $ y Bs. Tu clienta elige especialista y hora entre tus huecos libres de verdad, y te llega ordenado al WhatsApp.',
    foto: 'clienta-movil',
    fotoBanda: 'unas-nude',
    dolores: [
      'Contestas «¿precio?» y «¿tienes hueco?» veinte veces al día.',
      'De noche te escriben y por la mañana ya reservaron en otro sitio.',
      'Rehaces el PDF de precios cada vez que cambia la tasa.',
    ],
    pasos: [
      { titulo: 'Entra desde tu QR o tu Instagram', texto: 'Sin descargar nada y sin contraseñas. Ve tu marca, tus fotos y tus precios del día.' },
      { titulo: 'Elige servicio, especialista y hora', texto: 'Solo ve los huecos libres de verdad, con la duración exacta de cada servicio. Nunca se pisan dos citas.' },
      { titulo: 'Te llega al WhatsApp, ya ordenada', texto: 'Servicio, especialista, día, hora y precio con la oferta aplicada. Confirmas con un toque y queda en tu agenda.' },
    ],
    incluye: [
      { icono: 'paleta', titulo: 'Con tu firma', texto: 'Tus colores, tus letras y tus fotos. Nada de plantillas iguales para todas.' },
      { icono: 'cartera', titulo: 'Precios en $ y Bs', texto: 'Cambias un precio desde el móvil y tus clientas lo ven al instante.' },
      { icono: 'calendario', titulo: 'Huecos reales', texto: 'Cada servicio con su duración; la agenda calcula sola lo que cabe.' },
      { icono: 'equipo', titulo: 'Por especialista', texto: 'La clienta elige con quién, y cada una tiene su agenda.' },
      { icono: 'whatsapp', titulo: 'Directo a tu WhatsApp', texto: 'La reserva te llega completa, sin ir y venir de mensajes.' },
      { icono: 'campana', titulo: 'Recordatorio 24 h antes', texto: 'Desde tu propio WhatsApp y por correo, para que no se olvide.', pronto: true },
      { icono: 'cartera', titulo: 'Seña al reservar', texto: 'Con comprobante de Pago Móvil, Zelle o Binance que validas en un toque.', pronto: true },
      { icono: 'movil', titulo: 'Se instala como app', texto: 'Tu carta en la pantalla de inicio de tu clienta, con tu icono.', pronto: true },
    ],
    frase: 'Tu clienta reserva a las 23:48. Tú te enteras por la mañana, con la cita ya en tu agenda.',
    preguntas: [
      ['¿Mis clientas tienen que registrarse?', 'No. Reservan con su nombre y su teléfono. Muy pronto también podrán ver sus citas y sus sellos con un código que les llega al correo, sin contraseña.'],
      ['¿Y si una clienta quiere dos servicios a la vez?', 'Hoy reserva cada servicio por separado. Muy pronto podrá elegir varios en la misma cita (por ejemplo, manos y pies) y la agenda reservará el tiempo total.'],
      ['¿Puedo bloquear días u horas?', 'Sí. Vacaciones, festivos o una tarde libre: lo bloqueas en tu panel y deja de ofrecerse.'],
    ],
    meta: 'Carta digital con tu marca y reservas por especialista que te llegan ordenadas al WhatsApp. Precios en dólares y bolívares.',
  },
  {
    ruta: '/funciones/pasaporte-vip',
    menu: 'Pasaporte VIP',
    etiqueta: 'Pasaporte VIP',
    titulo: 'Que vuelvan contigo,',
    acento: 'no con la de enfrente.',
    subtitulo: 'Un pasaporte de sellos en el móvil de tu clienta. Cada cita cerrada suma un sello solo y, a la quinta, su premio la está esperando.',
    foto: 'unas-francesa',
    fotoBanda: 'unas-arte',
    dolores: [
      'La tarjeta de cartulina se pierde en el bolso o se moja.',
      'No sabes qué clientas hace meses que no vuelven.',
      'Tu competencia ofrece lo mismo y tu clienta no tiene motivo para quedarse.',
    ],
    pasos: [
      { titulo: 'Atiendes a tu clienta', texto: 'Al cerrar su cita en tu panel, el sello se suma solo a su pasaporte.' },
      { titulo: 'Ella ve su progreso', texto: 'Desde tu carta, en su móvil, sin instalar nada: «te faltan 2 para tu premio».' },
      { titulo: 'Canjea su premio', texto: 'A la quinta visita, su premio queda listo. Tú eliges cuál: un diseño de cejas, un descuento, un tratamiento.' },
    ],
    incluye: [
      { icono: 'premio', titulo: 'Sellos automáticos', texto: 'Se suman al cerrar la cita; nadie tiene que acordarse.' },
      { icono: 'regalo', titulo: 'Tu premio', texto: 'Eliges qué regalas y a cuántas visitas.' },
      { icono: 'escudo', titulo: 'A prueba de trampas', texto: 'Solo tu equipo puede sellar, con su propia clave.' },
      { icono: 'grafica', titulo: 'Tus fieles, a la vista', texto: 'Ves quién vuelve y quién hace tiempo que no viene.', pronto: true },
      { icono: 'corazon', titulo: 'Referidos', texto: 'Descuento para la clienta que trae a una amiga, y para la amiga.', pronto: true },
      { icono: 'movil', titulo: 'Su cuenta', texto: 'Sus citas y sus sellos con un código por correo, sin contraseña.', pronto: true },
    ],
    frase: 'Una clienta que vuelve vale más que diez que pasan una vez.',
    preguntas: [
      ['¿La clienta necesita instalar algo?', 'No. Consulta sus sellos desde tu carta con su teléfono.'],
      ['¿Puedo cambiar el premio?', 'Sí, cuando quieras, desde tu panel. Los sellos que ya tiene se mantienen.'],
      ['¿Quién puede poner sellos?', 'Tú y tu equipo, cada una con su clave. Así nadie suma sellos por su cuenta.'],
    ],
    meta: 'Pasaporte VIP de sellos en el móvil de tu clienta: cada visita suma y a la quinta tiene su premio. Fidelización sin cartulinas.',
  },
  {
    ruta: '/funciones/equipo-y-agenda',
    menu: 'Equipo y agenda',
    etiqueta: 'Equipo y agenda',
    titulo: 'Todo tu estudio,',
    acento: 'en una sola pantalla.',
    subtitulo: 'La agenda de cada especialista, cada cabina y cada aparato. Tú lo ves todo; tu equipo, solo lo suyo.',
    foto: 'pelo-salon',
    fotoBanda: 'cejas-laminado',
    dolores: [
      'Una libreta, tres móviles y dos citas a la misma hora.',
      'Tu equipo ve tu caja y tus números, o no ve nada.',
      'Los servicios largos te bloquean el sillón sin que nadie lo sepa.',
    ],
    pasos: [
      { titulo: 'Das de alta a tu equipo', texto: 'Cada especialista con sus servicios, sus horarios y su propia clave.' },
      { titulo: 'Defines tus zonas', texto: 'Cabinas, sillones, lavacabezas o aparatos, cada uno con su agenda.' },
      { titulo: 'La agenda se ordena sola', texto: 'Las reservas caen donde caben, sin cruces. Tú ves la semana completa y la caja del día.' },
    ],
    incluye: [
      { icono: 'equipo', titulo: '3 personas incluidas', texto: 'Y cada profesional más, 3 $ al mes.' },
      { icono: 'reloj', titulo: '3 zonas incluidas', texto: 'Cabinas, sillones o aparatos con su propia agenda.' },
      { icono: 'candado', titulo: 'Una clave para cada una', texto: 'Ven su día y sellan el Pasaporte. La caja es solo tuya.' },
      { icono: 'calendario', titulo: 'Vista de día, semana y mes', texto: 'Con la ocupación y las citas de cada especialista.' },
      { icono: 'cartera', titulo: 'Tu caja en $ y Bs', texto: 'Lo facturado en la semana, por especialista y por servicio.' },
      { icono: 'whatsapp', titulo: 'Avisos a tu equipo', texto: 'Cada especialista recibe sus citas nuevas en su WhatsApp.', pronto: true },
    ],
    frase: 'Tú diriges. La agenda se ordena sola.',
    preguntas: [
      ['¿Mi equipo ve lo que facturo?', 'No. Cada especialista ve su agenda y sus clientas; la caja y los números son solo tuyos.'],
      ['¿Qué pasa si tengo más de 3 personas?', 'Cada profesional más cuesta 3 $ al mes. Sin cambiar de plan.'],
      ['¿Puedo usarla yo sola?', 'Claro. Muchas dueñas empiezan solas y añaden a su equipo cuando crecen.'],
    ],
    meta: 'Agenda por especialista, cabina y aparato, con una clave para cada una. Tu caja en dólares y bolívares, solo para ti.',
  },
  {
    ruta: '/funciones/ofertas-y-tarjetas-regalo',
    menu: 'Ofertas y regalos',
    etiqueta: 'Ofertas, cupones y tarjetas regalo',
    titulo: 'Llena los días flojos',
    acento: 'sin regalar tu trabajo.',
    subtitulo: 'Ofertas con fecha y hora, cupones de descuento y tarjetas regalo con saldo. El precio exacto lo calcula el sistema, nunca la clienta.',
    foto: 'unas-arte',
    fotoBanda: 'unas-rosa',
    dolores: [
      'Los martes por la mañana tu agenda está vacía.',
      'Haces una promoción en historias y luego cada una entiende un precio distinto.',
      'Te piden un regalo para una amiga y no tienes cómo venderlo.',
    ],
    pasos: [
      { titulo: 'Creas la oferta', texto: '«Jueves de lifting −3 $» de 9:00 a 13:00, con fecha de inicio y de fin.' },
      { titulo: 'Sale en tu carta', texto: 'Con un banner y el precio especial ya aplicado en la reserva.' },
      { titulo: 'El sistema calcula', texto: 'Descuentos, cupones y saldo de tarjetas regalo, siempre con el precio exacto.' },
    ],
    incluye: [
      { icono: 'etiqueta', titulo: 'Ofertas con horario', texto: 'Por días, horas y servicios, con su banner en la carta.' },
      { icono: 'porcentaje', titulo: 'Cupones', texto: 'Códigos de descuento en $ o en %, con límite de usos.' },
      { icono: 'regalo', titulo: 'Tarjetas regalo', texto: 'Con saldo: si se cancela la cita, el saldo vuelve a la tarjeta.' },
      { icono: 'escudo', titulo: 'Precio a prueba de errores', texto: 'El servidor calcula el total; nadie puede cambiarlo.' },
      { icono: 'impresora', titulo: 'Paquetes de precio cerrado', texto: 'Combos como «manos y pies» con su precio especial.', pronto: true },
    ],
    frase: 'Una buena oferta llena tu agenda. Una mal calculada te la vacía.',
    preguntas: [
      ['¿Puedo limitar una oferta a ciertos servicios?', 'Sí: a los servicios, días y horas que elijas, con fecha de fin.'],
      ['¿Cómo vendo una tarjeta regalo?', 'La creas en tu panel con su saldo y se la das a tu clienta; quien la reciba la usa al reservar.'],
      ['¿Puedo quitar una oferta antes de tiempo?', 'Sí, la desactivas desde tu panel y deja de verse al instante.'],
    ],
    meta: 'Ofertas con fecha y hora, cupones y tarjetas regalo con saldo. El precio exacto lo calcula el sistema.',
  },
  {
    ruta: '/funciones/qr-y-kit',
    menu: 'QR y kit',
    etiqueta: 'Tu QR y tu kit',
    titulo: 'Un QR para siempre.',
    acento: 'Tu carta cambia, él no.',
    subtitulo: 'Lo imprimes una sola vez para tu recepción, tus espejos o tu Instagram. Cambias servicios, precios y ofertas y el QR sigue llevando a lo último.',
    foto: 'salon-lujo',
    fotoBanda: 'pelo-salon',
    dolores: [
      'Cada vez que cambias precios tienes que reimprimir.',
      'No sabes si alguien escanea los carteles que pusiste.',
      'Tu QR lleva a un enlace largo y feo, o a un PDF que nadie abre.',
    ],
    pasos: [
      { titulo: 'Descargas tu kit', texto: 'QR en alta calidad y piezas listas para imprimir con tu marca.' },
      { titulo: 'Lo colocas', texto: 'En la recepción, en los espejos, en tu tarjeta o en tu perfil de Instagram.' },
      { titulo: 'Mides lo que funciona', texto: 'Cada QR cuenta sus escaneos: sabes qué cartel trae más clientas.' },
    ],
    incluye: [
      { icono: 'qr', titulo: 'QR que no caduca', texto: 'Siempre lleva a tu carta actual.' },
      { icono: 'impresora', titulo: 'Kit para imprimir', texto: 'Cartel de mostrador, tarjeta y pegatina con tu marca.' },
      { icono: 'grafica', titulo: 'Escaneos contados', texto: 'Un QR por lugar y sabes cuál funciona mejor.' },
      { icono: 'paleta', titulo: 'Con tus colores', texto: 'El kit se genera con tu paleta y tu logo.' },
      { icono: 'movil', titulo: 'Para tu Instagram', texto: 'Enlace corto y elegante para tu biografía.' },
    ],
    frase: 'Imprimes una vez. Cambias cuando quieras.',
    preguntas: [
      ['¿Si cambio los precios tengo que reimprimir?', 'No. El QR lleva a tu carta, que siempre está al día.'],
      ['¿Puedo tener varios QR?', 'Sí, uno por lugar (recepción, espejos, flyers) para saber cuál trae más reservas.'],
      ['¿Dónde imprimo el kit?', 'En cualquier imprenta o en casa: te lo damos en alta calidad.'],
    ],
    meta: 'QR dinámico que no caduca y kit con tu marca listo para imprimir. Sabes cuántas veces se escanea cada cartel.',
  },
];

export const OFICIOS_WEB: PaginaContenido[] = [
  {
    ruta: '/para/unas',
    menu: 'Uñas',
    etiqueta: 'Para estudios de uñas',
    titulo: 'Tu mesa llena,',
    acento: 'sin vivir pegada al móvil.',
    subtitulo: 'Que tu clienta elija diseño, largo y extras antes de llegar, y que cada servicio ocupe el tiempo justo en tu agenda.',
    foto: 'unas-oscuras',
    fotoBanda: 'unas-rosa',
    dolores: [
      '«¿Cuánto cuesta con diseño?» a mitad de un esmaltado.',
      'Huecos de 30 minutos que nadie reserva.',
      'Clientas que no vuelven porque probaron en otro sitio.',
    ],
    pasos: [
      { titulo: 'Ve tus diseños y tus precios', texto: 'Manicura rusa, gel, polygel o pedicura, con fotos y extras.' },
      { titulo: 'Elige y reserva', texto: 'Con la duración exacta de cada servicio, y con la especialista que prefiera.' },
      { titulo: 'Vuelve por su sello', texto: 'A la quinta visita, su premio. Y tú, la mesa llena.' },
    ],
    incluye: [
      { icono: 'mano', titulo: 'Diseños y extras', texto: 'Largo, forma, diseño y retirada, cada uno con su precio.' },
      { icono: 'reloj', titulo: 'Tiempos exactos', texto: 'Cada combinación ocupa lo que dura, ni más ni menos.' },
      { icono: 'premio', titulo: 'Pasaporte VIP', texto: 'El motivo para que vuelva cada tres semanas.' },
      { icono: 'etiqueta', titulo: 'Ofertas de días flojos', texto: '«Martes de pedicura» con el precio ya aplicado.' },
    ],
    frase: 'Tú haces arte con las manos. Lo demás, que lo haga tu carta.',
    preguntas: [
      ['¿Puedo poner fotos de mis diseños?', 'Sí, en cada servicio, para que elijan antes de llegar.'],
      ['¿Y los retoques y retiradas?', 'Son servicios o extras con su precio y su tiempo.'],
    ],
    meta: 'Carta y reservas para estudios de uñas: diseños, extras y tiempos exactos, con Pasaporte VIP para que vuelvan.',
  },
  {
    ruta: '/para/pestanas-y-cejas',
    menu: 'Pestañas y cejas',
    etiqueta: 'Para estudios de pestañas y cejas',
    titulo: 'Cada técnica explicada',
    acento: 'antes de que pregunten.',
    subtitulo: 'Lifting, pelo a pelo, volumen, laminado o henna: tu clienta ve la diferencia, elige y reserva su retoque a tiempo.',
    foto: 'pestanas-tecnica',
    fotoBanda: 'cejas-laminado',
    dolores: [
      '«¿Qué diferencia hay entre lifting y extensiones?» cuarenta veces al día.',
      'Retoques que se pasan de fecha y acaban en una puesta nueva.',
      'Citas de dos horas que se cruzan con otras.',
    ],
    pasos: [
      { titulo: 'Ve cada técnica con su foto', texto: 'Qué es, cuánto dura y cada cuánto se retoca.' },
      { titulo: 'Reserva con su especialista', texto: 'Con el tiempo real de cada servicio y sin cruces.' },
      { titulo: 'Vuelve a su retoque', texto: 'Su Pasaporte VIP y su próxima cita, en su móvil.' },
    ],
    incluye: [
      { icono: 'ojo', titulo: 'Fichas por técnica', texto: 'Foto, duración y cuidados, para que llegue sabiendo.' },
      { icono: 'calendario', titulo: 'Retoques a tiempo', texto: 'El retoque como servicio propio, con su precio.' },
      { icono: 'campana', titulo: 'Aviso de retoque', texto: 'Recordatorio automático cuando le toca.', pronto: true },
      { icono: 'premio', titulo: 'Pasaporte VIP', texto: 'Cada retoque suma un sello.' },
    ],
    frase: 'Una mirada bonita se mantiene. Que tu agenda también.',
    preguntas: [
      ['¿Puedo separar pestañas y cejas por especialista?', 'Sí, cada especialista con sus servicios y su agenda.'],
      ['¿Se pueden poner cuidados posteriores?', 'Sí, en la ficha de cada servicio.'],
    ],
    meta: 'Carta y reservas para estudios de pestañas y cejas: cada técnica explicada, retoques a tiempo y Pasaporte VIP.',
  },
  {
    ruta: '/para/peluqueria',
    menu: 'Peluquería',
    etiqueta: 'Para peluquerías',
    titulo: 'Servicios de tres horas',
    acento: 'sin cruces en tu agenda.',
    subtitulo: 'Color, alisados y recogidos con su sillón, su lavacabezas y su estilista reservados. Y tu clienta ve el precio antes de sentarse.',
    foto: 'pelo-salon',
    fotoBanda: 'pelo-secado',
    dolores: [
      'Un balayage que se alarga y te descuadra la tarde.',
      'El lavacabezas ocupado justo cuando lo necesitas.',
      '«¿Cuánto cuesta un alisado?» y la respuesta siempre es «depende».',
    ],
    pasos: [
      { titulo: 'Ve tus servicios por largo', texto: 'Corto, medio y largo con su precio, sin sorpresas.' },
      { titulo: 'Reserva su estilista', texto: 'Con el tiempo de cada servicio y la zona que necesita.' },
      { titulo: 'Tu agenda no se cruza', texto: 'Sillón, lavacabezas y estilista ocupados lo justo.' },
    ],
    incluye: [
      { icono: 'tijeras', titulo: 'Precios por largo', texto: 'Corto, medio y largo, cada uno con su precio y su tiempo.' },
      { icono: 'reloj', titulo: 'Zonas y sillones', texto: 'Cada sillón y cada lavacabezas con su agenda.' },
      { icono: 'equipo', titulo: 'Por estilista', texto: 'La clienta elige con quién, y cada una ve su día.' },
      { icono: 'regalo', titulo: 'Tarjetas regalo', texto: 'Perfectas para cumpleaños y fechas especiales.' },
    ],
    frase: 'Tu talento no cabe en una libreta.',
    preguntas: [
      ['¿Puedo poner precios distintos según el largo?', 'Sí: cada largo es un servicio con su precio y su tiempo, y aparecen juntos en tu carta.'],
      ['¿Y los servicios que necesitan dos zonas?', 'La agenda reserva el tiempo total de tu estilista y la zona que elijas.'],
    ],
    meta: 'Carta y reservas para peluquerías: servicios largos sin cruces, precios por largo y agenda por estilista y sillón.',
  },
  {
    ruta: '/para/estetica',
    menu: 'Estética',
    etiqueta: 'Para centros de estética',
    titulo: 'Cada cabina y cada aparato',
    acento: 'con su propia agenda.',
    subtitulo: 'Faciales, corporales y depilación con el historial de cada clienta y sus sesiones contadas.',
    foto: 'estetica-facial',
    fotoBanda: 'estetica-bodegon',
    dolores: [
      'Dos citas para el mismo aparato a la misma hora.',
      'Bonos de sesiones apuntados en papel.',
      'Clientas que no terminan su tratamiento.',
    ],
    pasos: [
      { titulo: 'Ve tus tratamientos', texto: 'Con lo que incluye cada uno, su duración y sus cuidados.' },
      { titulo: 'Reserva cabina y especialista', texto: 'La agenda reserva el aparato que necesita.' },
      { titulo: 'Completa su tratamiento', texto: 'Su Pasaporte VIP la anima a volver a cada sesión.' },
    ],
    incluye: [
      { icono: 'gota', titulo: 'Fichas de tratamiento', texto: 'Qué incluye, cuánto dura y qué cuidados lleva.' },
      { icono: 'reloj', titulo: 'Cabinas y aparatos', texto: 'Cada uno con su agenda, sin dobles reservas.' },
      { icono: 'grafica', titulo: 'Historial de la clienta', texto: 'Sus citas y sus servicios, a la vista.', pronto: true },
      { icono: 'impresora', titulo: 'Bonos de sesiones', texto: 'Paquetes de precio cerrado con sesiones contadas.', pronto: true },
    ],
    frase: 'Un tratamiento completo es una clienta feliz. Y fiel.',
    preguntas: [
      ['¿Puedo asignar un aparato a cada servicio?', 'Sí: cada servicio usa la zona o el aparato que indiques.'],
      ['¿Sirve para clínicas?', 'Sí, para la agenda y la carta. Los datos médicos no se guardan en VANESEV.'],
    ],
    meta: 'Carta y reservas para centros de estética: cabinas y aparatos con su agenda, historial de la clienta y Pasaporte VIP.',
  },
];

export const TODAS_LAS_PAGINAS = [...FUNCIONES, ...OFICIOS_WEB];
