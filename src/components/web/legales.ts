/*
 * Textos legales de vanesev.com (T-37, G-055): redactados para Venezuela, sin datos fiscales publicados.
 * La razón social y el RIF se añadirán cuando karc0 los autorice.
 */

export interface DocumentoLegal {
  id: string;
  titulo: string;
  resumen: string;
  secciones: [string, string[]][];
}

const CONTACTO = 'por WhatsApp al +58 422-3794800';

export const LEGALES: DocumentoLegal[] = [
  {
    id: 'aviso-legal',
    titulo: 'Aviso legal',
    resumen: 'Quién está detrás de vanesev.com, para qué sirve esta web y las reglas básicas para usarla.',
    secciones: [
      ['Titular', [
        `Este sitio web y la plataforma VANESEV son operados por VANESEV. Puedes contactar con nosotros ${CONTACTO}.`,
        'Los datos de registro mercantil y fiscal del titular se publicarán en este apartado en cuanto estén disponibles.',
      ]],
      ['Objeto', [
        'vanesev.com presenta VANESEV, una plataforma para estudios de belleza que reúne carta digital, reservas, agenda de equipo, Pasaporte VIP de fidelidad, ofertas y tarjetas regalo.',
        'La contratación del servicio se rige por las Condiciones del servicio.',
      ]],
      ['Uso del sitio', [
        'Al navegar por esta web te comprometes a hacer un uso lícito y respetuoso, sin intentar acceder a zonas restringidas, alterar su funcionamiento ni utilizarla para fines fraudulentos.',
      ]],
      ['Propiedad intelectual', [
        'La marca VANESEV, el diseño, los textos, las imágenes y el código de esta web pertenecen a su titular o se usan con licencia. No está permitido copiarlos ni reutilizarlos sin autorización por escrito.',
        'Los estudios que usan VANESEV conservan la titularidad de sus propias marcas, fotografías y contenidos.',
      ]],
      ['Legislación aplicable', [
        'Este sitio se rige por las leyes de la República Bolivariana de Venezuela, incluido el Decreto con Fuerza de Ley sobre Mensajes de Datos y Firmas Electrónicas y la Ley Especial contra los Delitos Informáticos.',
      ]],
    ],
  },
  {
    id: 'privacidad',
    titulo: 'Privacidad',
    resumen: 'Qué datos tratamos, para qué, durante cuánto tiempo y cómo puedes ejercer tus derechos.',
    secciones: [
      ['Nuestro compromiso', [
        'Respetamos el derecho a la privacidad y a la protección de los datos personales reconocido en los artículos 28 y 60 de la Constitución de la República Bolivariana de Venezuela. Solo pedimos los datos necesarios y nunca los vendemos.',
      ]],
      ['Datos de las dueñas de estudio', [
        'Cuando solicitas tu plaza o te das de alta tratamos el nombre de tu estudio, tu nombre, tu teléfono de WhatsApp y tu correo, para contactarte, preparar tu carta y prestarte el servicio.',
        'Dentro de tu panel guardamos lo que tú introduces: servicios, precios, horarios, equipo, zonas, ofertas y fotografías.',
      ]],
      ['Datos de las clientas de cada estudio', [
        'Cuando una clienta reserva en la carta de un estudio, se guardan su nombre, su teléfono, su correo si lo indica, sus citas y sus sellos del Pasaporte VIP.',
        'Esos datos pertenecen al estudio, que es quien decide sobre ellos. VANESEV los trata en su nombre, solo para prestarle el servicio, y los mantiene separados de los de cualquier otro estudio.',
      ]],
      ['Dónde se guardan', [
        'La web y la base de datos están alojadas en proveedores de nube con servidores fuera de Venezuela (Vercel y Neon). Los correos del servicio se envían a través de un proveedor de correo profesional. Todos ellos aplican medidas de seguridad estándar del sector, como el cifrado de las conexiones.',
      ]],
      ['Cuánto tiempo', [
        'Conservamos los datos mientras el estudio use VANESEV. Si se da de baja, puede pedirnos una copia de sus datos y después los eliminamos, salvo lo que la ley obligue a conservar.',
      ]],
      ['Tus derechos', [
        `Puedes pedir acceso, corrección o eliminación de tus datos ${CONTACTO}. Si eres clienta de un estudio, puedes dirigirte a ese estudio o a nosotros, y lo trasladaremos.`,
      ]],
      ['Seguridad', [
        'Las contraseñas se guardan cifradas, los accesos están protegidos con sesión y límite de intentos, y cada estudio solo puede ver sus propios datos.',
      ]],
    ],
  },
  {
    id: 'cookies',
    titulo: 'Cookies',
    resumen: 'vanesev.com solo usa cookies y almacenamiento técnicos, imprescindibles para que la web funcione. No usamos cookies de publicidad ni de analítica.',
    secciones: [
      ['Qué usamos', [
        'Una cookie técnica que recuerda que ya viste el aviso de cookies, para no mostrártelo en cada visita.',
        'En los paneles de los estudios y de su equipo, cookies de sesión que mantienen la sesión iniciada de forma segura. Caducan al cerrar la sesión o al pasar su tiempo de validez.',
        'En la carta de cada estudio, almacenamiento local del navegador para recordar datos de uso, como el estudio que estás viendo.',
      ]],
      ['Qué no usamos', [
        'No usamos cookies de publicidad, de perfiles ni de terceros para seguirte por otras webs, ni herramientas de analítica que te identifiquen.',
      ]],
      ['Cómo gestionarlas', [
        'Puedes borrar o bloquear las cookies desde la configuración de tu navegador. Si bloqueas las cookies técnicas, es posible que no puedas iniciar sesión en los paneles.',
      ]],
      ['Cambios', [
        'Si en el futuro incorporamos otro tipo de cookies, lo indicaremos aquí y te pediremos permiso antes de usarlas.',
      ]],
    ],
  },
  {
    id: 'condiciones',
    titulo: 'Condiciones del servicio',
    resumen: 'Las reglas de uso de VANESEV para los estudios: planes, pagos, datos y responsabilidades.',
    secciones: [
      ['El servicio', [
        'VANESEV ofrece a los estudios de belleza una carta digital con reservas, agenda por especialista y zona, Pasaporte VIP de fidelidad, ofertas, cupones, tarjetas regalo, códigos QR y un panel de gestión. Las funciones marcadas «muy pronto» en la web aún no están disponibles.',
      ]],
      ['Planes y pagos', [
        'El plan Esencial cuesta 19 $ al mes o 171 $ al año, e incluye 3 personas y 3 zonas; cada profesional adicional cuesta 3 $ al mes. El montaje de fundadora cuesta 49 $ para las 100 primeras plazas. Los precios pueden pagarse por los medios que se indiquen al dar de alta el estudio.',
        'No cobramos comisiones por las reservas ni por las clientas nuevas.',
      ]],
      ['Prueba y permanencia', [
        'Cada estudio dispone de 14 días para probar el servicio. No hay permanencia: puedes darte de baja cuando quieras, y la baja tiene efecto al final del periodo pagado.',
      ]],
      ['Tus datos y tus contenidos', [
        'Los servicios, precios, fotografías, marca y datos de clientas son del estudio. El estudio es responsable de tener derecho a usar las imágenes que sube y de informar a sus clientas de que reserva a través de VANESEV.',
        'Al darte de baja puedes pedir una copia de tus datos.',
      ]],
      ['Uso aceptable', [
        'No está permitido usar VANESEV para actividades ilícitas, publicar contenidos engañosos u ofensivos, ni intentar acceder a los datos de otros estudios. Podremos suspender las cuentas que incumplan estas reglas.',
      ]],
      ['Disponibilidad y responsabilidad', [
        'Trabajamos para que el servicio esté disponible siempre, pero puede haber interrupciones por mantenimiento o por causas ajenas. VANESEV no es responsable de la relación entre el estudio y sus clientas ni de los servicios de belleza que se prestan.',
      ]],
      ['Cambios y legislación', [
        'Si cambiamos estas condiciones o los precios, te avisaremos con antelación. Estas condiciones se rigen por las leyes de la República Bolivariana de Venezuela, y cualquier controversia se someterá a sus tribunales competentes.',
      ]],
    ],
  },
];
