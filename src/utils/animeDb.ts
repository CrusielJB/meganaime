import { Anime, Episode } from "../types";

export const MOCK_ANIMES: Anime[] = [
  {
    id: "mushoku-tensei-3",
    title: "Mushoku Tensei: Jobless Reincarnation Temporada 3",
    synopsis: "La esperada tercera temporada de las aventuras de Rudeus Greyrat. En esta temporada, Rudeus continúa su viaje por el continente, enfrentando nuevos retos mágicos y emocionales tras el reencuentro con sus seres queridos.",
    coverUrl: "https://s4.anilist.co/file/anilistcdn/media/anime/cover/medium/bx178789-hNXjKFzUq7mk.jpg",
    bannerUrl: "https://images8.alphacoders.com/131/1319760.png",
    genres: ["Fantasía", "Aventura", "Isekai", "Drama"],
    status: "En emisión",
    rating: 9.0,
    type: "Anime",
    episodesCount: 2,
    year: 2026,
    episodes: [],
    title_romaji: "Mushoku Tensei: Isekai Ittara Honki Dasu Season 3",
    title_english: "Mushoku Tensei: Jobless Reincarnation Season 3",
    title_native: "無職転生 ～異世界行ったら本気だす～ 第3期",
    external_id: "178789"
  },
  {
    id: "one-piece",
    title: "One Piece",
    synopsis: "Riqueza, fama, poder... el hombre que lo consiguió todo en este mundo fue el Rey de los Piratas, Gold Roger. Antes de morir, sus últimas palabras inspiraron al mundo a lanzarse al mar: '¿Mis riquezas y tesoros? Si los queréis, os los doy. ¡Buscadlos! Lo dejé todo en ese lugar'. Así comenzó la Gran Era de los Piratas, con piratas de todo el mundo izando sus banderas y compitiendo por encontrar el gran tesoro legendario: el One Piece.",
    coverUrl: "https://s4.anilist.co/file/anilistcdn/media/anime/cover/medium/bx21-ELSYx3yMPcKM.jpg",
    bannerUrl: "https://images7.alphacoders.com/112/1127025.jpg",
    genres: ["Acción", "Aventura", "Fantasía", "Shounen", "Comedia"],
    status: "En emisión",
    rating: 9.3,
    type: "Anime",
    episodesCount: 1115,
    year: 1999,
    episodes: [],
    title_romaji: "One Piece",
    title_english: "One Piece",
    title_native: "ワンピース",
    external_id: "21",
    relatedMangas: [
      {
        id: "one-piece-manga",
        title: "One Piece (Manga)",
        synopsis: "Gol D. Roger fue conocido como el Rey de los Piratas, el ser más fuerte e infame que navegó en el Grand Line. La captura y ejecución de Roger por el Gobierno Mundial trajo un cambio en todo el mundo.",
        coverUrl: "https://s4.anilist.co/file/anilistcdn/media/manga/cover/medium/bx96792-hqZV0JqlBsW4.jpg",
        genres: ["Acción", "Aventura", "Comedia", "Fantasía", "Shounen"],
        status: "En emisión",
        year: 1997,
        chaptersCount: 1100,
        rating: 9.5
      }
    ]
  },
  {
    id: "one-piece-pelicula-gigantes",
    title: "One Piece Film Red",
    synopsis: "Uta, la cantante más querida del mundo, cuya voz ha sido descrita como 'de otro mundo', es famosa por ocultar su propia identidad al actuar. Ahora, por primera vez, se revelará al mundo en un concierto en vivo.",
    coverUrl: "https://s4.anilist.co/file/anilistcdn/media/anime/cover/medium/bx141902-fTyoTk8F8qOl.jpg",
    bannerUrl: "https://images7.alphacoders.com/112/1127025.jpg",
    genres: ["Acción", "Aventura", "Fantasía", "Shounen", "Musical"],
    status: "Finalizado",
    rating: 8.5,
    type: "Película",
    episodesCount: 1,
    year: 2022,
    episodes: [
      {
        id: "one-piece-film-red-e1",
        title: "One Piece Film Red",
        number: 1,
        animeId: "one-piece-pelicula-gigantes",
        animeTitle: "One Piece Film Red",
        releaseDate: "06 ago 2022"
      }
    ],
    external_id: "50594",
    title_english: "One Piece Film: Red",
    title_romaji: "One Piece Film: Red"
  },
  {
    id: "kimetsu-no-yaiba-hashira-geiko-hen",
    title: "Kimetsu no Yaiba Temporada 4",
    synopsis: "El entrenamiento de los Pilares comienza con el fin de prepararse para la inminente batalla contra Muzan Kibutsuji y las Lunas Superiores. Cada Pilar lidera un régimen de entrenamiento intensivo para mejorar las habilidades físicas y de combate de todos los cazadores de demonios, incluidos Tanjiro, Zenitsu e Inosuke.",
    coverUrl: "https://s4.anilist.co/file/anilistcdn/media/anime/cover/medium/bx170942-KKcLfQzV57nG.jpg",
    bannerUrl: "https://images5.alphacoders.com/134/1340156.jpeg",
    genres: ["Acción", "Fantasía", "Sobrenatural", "Shounen"],
    status: "Finalizado",
    rating: 8.9,
    type: "Anime",
    episodesCount: 8,
    year: 2024,
    episodes: [],
    external_id: "170942",
    title_english: "Demon Slayer: Hashira Training Arc",
    title_romaji: "Kimetsu no Yaiba: Hashira Geiko-hen"
  },
  {
    id: "kaiju-no-8",
    title: "Kaiju No. 8",
    synopsis: "En un mundo plagado de criaturas conocidas como Kaiju, Kafka Hibino aspira a unirse a las Fuerzas de Defensa de Japón para cumplir una promesa de la infancia. Sin embargo, tras un encuentro inesperado con un misterioso kaiju parásito, Kafka adquiere la habilidad de transformarse él mismo en un Kaiju, ganando un inmenso poder mientras mantiene su conciencia humana.",
    coverUrl: "https://s4.anilist.co/file/anilistcdn/media/anime/cover/medium/bx166240-PBV7zukIHW7V.png",
    bannerUrl: "https://images4.alphacoders.com/134/1340915.jpeg",
    genres: ["Acción", "Ciencia Ficción", "Shounen", "Mecha"],
    status: "En emisión",
    rating: 8.7,
    type: "Anime",
    episodesCount: 12,
    year: 2024,
    episodes: [],
    external_id: "166240",
    title_english: "Kaiju No. 8",
    title_romaji: "Kaiju No. 8"
  },
  {
    id: "solo-leveling",
    title: "Solo Leveling Temporada 1",
    synopsis: "Hace diez años, apareció 'la Puerta' que conecta el mundo real con el mundo de los monstruos. Las personas ordinarias que recibieron poderes para cazar monstruos dentro de la Puerta pasaron a ser conocidas como 'Cazadores'. Sung Jin-Woo es conocido como el cazador más débil de la humanidad de rango E. Un día, queda atrapado en una mazmorra doble de alto peligro y, al borde de la muerte, acepta un misterioso sistema de misiones que le permite subir de nivel de forma ilimitada.",
    coverUrl: "https://s4.anilist.co/file/anilistcdn/media/anime/cover/medium/bx170890-XrggQYjAJAGa.jpg",
    bannerUrl: "https://images2.alphacoders.com/132/1328906.jpeg",
    genres: ["Acción", "Fantasía", "Aventura", "Seinen"],
    status: "Finalizado",
    rating: 9.1,
    type: "Anime",
    episodesCount: 12,
    year: 2024,
    episodes: [],
    relatedMangas: [
      {
        id: "solo-leveling-manhwa",
        title: "Solo Leveling (Manhwa)",
        synopsis: "Hace diez años, después de que 'la Puerta' que conectaba el mundo real con el mundo de los monstruos se abriera, algunas de las personas comunes y corrientes recibieron el poder de cazar monstruos dentro de la Puerta. Se les conoce como 'Cazadores'.",
        coverUrl: "https://s4.anilist.co/file/anilistcdn/media/manga/cover/medium/bx121496-oroRMihRAA89.jpg",
        genres: ["Acción", "Aventura", "Fantasía"],
        status: "Finalizado",
        year: 2018,
        chaptersCount: 179,
        rating: 9.2
      }
    ],
    external_id: "170890",
    title_english: "Solo Leveling",
    title_romaji: "Ore dake Level Up na Ken"
  },
  {
    id: "jujutsu-kaisen-tv",
    title: "Jujutsu Kaisen Temporada 1",
    synopsis: "La primera temporada de Jujutsu Kaisen sigue a Yuji Itadori, un estudiante de secundaria que se convierte en recipiente de una poderosa maldición, Sukuna, al salvar a sus amigos. Ahora, unido a la Escuela de Hechicería de Tokio, debe aprender a controlar sus poderes and luchar contra espíritus malditos mientras busca reunir todos los dedos de Sukuna.",
    coverUrl: "https://s4.anilist.co/file/anilistcdn/media/anime/cover/medium/bx113415-LHBAeoZDIsnF.jpg",
    bannerUrl: "https://images8.alphacoders.com/109/1095908.jpg",
    genres: ["Acción", "Sobrenatural", "Fantasía", "Shounen"],
    status: "Finalizado",
    rating: 8.7,
    type: "Anime",
    episodesCount: 24,
    year: 2020,
    episodes: [],
    relatedMangas: [
      {
        id: "jujutsu-kaisen-manga",
        title: "Jujutsu Kaisen (Manga)",
        synopsis: "Yuji Itadori es un estudiante de secundaria con una fuerza física asombrosa. Tras la muerte de su abuelo, se ve envuelto en el mundo de los hechiceros y las maldiciones al ingerir un dedo del legendario Rey de las Maldiciones, Ryomen Sukuna.",
        coverUrl: "https://s4.anilist.co/file/anilistcdn/media/manga/cover/medium/bx104050-7SS19qVOCeZl.png",
        genres: ["Acción", "Fantasía", "Sobrenatural", "Shounen"],
        status: "En emisión",
        year: 2018,
        chaptersCount: 260,
        rating: 8.6
      }
    ],
    external_id: "113415",
    title_english: "Jujutsu Kaisen",
    title_romaji: "Jujutsu Kaisen"
  },
  {
    id: "jujutsu-kaisen-tv-2",
    title: "Jujutsu Kaisen Temporada 2",
    synopsis: "La segunda temporada explora el pasado de Satoru Gojo y Suguru Geto durante sus días en la academia de Jujutsu en el Arco del Inventario Oculto / Muerte Prematura, seguido por el asombroso y destructivo Incidente de Shibuya en el presente, donde las maldiciones planean sellar al hechicero más fuerte del mundo.",
    coverUrl: "https://s4.anilist.co/file/anilistcdn/media/anime/cover/medium/bx145064-hSNRJM03pvv1.jpg",
    bannerUrl: "https://images8.alphacoders.com/132/1321743.jpeg",
    genres: ["Acción", "Sobrenatural", "Fantasía", "Shounen", "Misterio"],
    status: "Finalizado",
    rating: 9.4,
    type: "Anime",
    episodesCount: 23,
    year: 2023,
    episodes: [],
    external_id: "145064",
    title_english: "Jujutsu Kaisen Season 2",
    title_romaji: "Jujutsu Kaisen 2nd Season"
  },
  {
    id: "chainsaw-man",
    title: "Chainsaw Man Temporada 1",
    synopsis: "Denji es un joven atrapado en la pobreza extrema que caza demonios para pagar las inmensas deudas de su difunto padre con la Yakuza, ayudado por su perro demonio Pochita. Tras ser traicionado y disminuido, Pochita se fusiona con el corazón de Denji, resucitándolo como Chainsaw Man, un híbrido con motosierras en sus extremidades y cabeza. Rápidamente es reclutado por Makima para la División de Seguridad Pública.",
    coverUrl: "https://s4.anilist.co/file/anilistcdn/media/anime/cover/medium/bx127230-DdP4vAdssLoz.png",
    bannerUrl: "https://images4.alphacoders.com/123/1233857.jpg",
    genres: ["Acción", "Terror", "Sobrenatural", "Comedia", "Seinen"],
    status: "Finalizado",
    rating: 8.8,
    type: "Anime",
    episodesCount: 12,
    year: 2022,
    episodes: [],
    relatedMangas: [
      {
        id: "chainsaw-man-manga",
        title: "Chainsaw Man (Manga)",
        synopsis: "Denji es un joven atrapado en la pobreza extrema que caza demonios para pagar las inmensas deudas de su difunto padre con la Yakuza, ayudado por su perro demonio Pochita. La historia sigue su vida tras fusionarse con Pochita.",
        coverUrl: "https://s4.anilist.co/file/anilistcdn/media/manga/cover/medium/bx105778-euxXZEIfDY2u.png",
        genres: ["Acción", "Terror", "Sobrenatural", "Comedia"],
        status: "En emisión",
        year: 2018,
        chaptersCount: 160,
        rating: 8.7
      }
    ],
    external_id: "127230",
    title_english: "Chainsaw Man",
    title_romaji: "Chainsaw Man"
  },
  {
    id: "oshi-no-ko",
    title: "Oshi no Ko Temporada 1",
    synopsis: "La historia sigue a Ai Hoshino, una ídolo talentosa y hermosa que es adorada por sus fans. Pero tras bambalinas, las cosas no son tan brillantes como parecen. Cuando Ai queda embarazada en secreto, le pide ayuda a su médico, Gorou Amamiya, quien termina siendo asesinado, solo para reencarnar como uno de los hijos gemelos de Ai.",
    coverUrl: "https://s4.anilist.co/file/anilistcdn/media/anime/cover/medium/bx166531-dAL5MsqDHUkj.jpg",
    bannerUrl: "https://images.alphacoders.com/131/1310617.jpg",
    genres: ["Drama", "Misterio", "Sobrenatural", "Comedia"],
    status: "Finalizado",
    rating: 9.1,
    type: "Anime",
    episodesCount: 11,
    year: 2023,
    episodes: [],
    relatedMangas: [
      {
        id: "oshi-no-ko-manga",
        title: "[Oshi No Ko] (Manga)",
        synopsis: "Gorou Amamiya es un ginecólogo que ayuda al parto de los hijos de su ídolo favorita, Ai Hoshino. Sin embargo, antes de que los bebés nazcan, Gorou es asesinado por un acosador de Ai, solo para reencarnar como Aquamarine Hoshino, uno de los hijos de Ai.",
        coverUrl: "https://s4.anilist.co/file/anilistcdn/media/manga/cover/medium/bx117195-r3kf8eF0xkDJ.png",
        genres: ["Drama", "Misterio", "Sobrenatural"],
        status: "En emisión",
        year: 2020,
        chaptersCount: 150,
        rating: 8.8
      }
    ],
    external_id: "166531",
    title_english: "Oshi no Ko",
    title_romaji: "[Oshi no Ko]"
  },
  {
    id: "oshi-no-ko-2nd-season",
    title: "Oshi no Ko Temporada 2",
    synopsis: "La historia se adentra en el oscuro y competitivo mundo del espectáculo japonés. Aqua Hoshino continúa su búsqueda de venganza infiltrándose en la obra de teatro en vivo de 'Tokyo Blade', donde se reúne con Kana Arima, Akane Kurokawa y otros jóvenes talentos de la actuación dramática.",
    coverUrl: "https://s4.anilist.co/file/anilistcdn/media/anime/cover/medium/bx150672-WqmmwZ4nMzAy.png",
    bannerUrl: "https://images2.alphacoders.com/136/1364741.png",
    genres: ["Drama", "Misterio", "Sobrenatural", "Comedia"],
    status: "En emisión",
    rating: 9.0,
    type: "Anime",
    episodesCount: 13,
    year: 2024,
    episodes: [],
    external_id: "172897",
    title_english: "Oshi no Ko Season 2",
    title_romaji: "[Oshi no Ko] 2nd Season"
  },
  {
    id: "boku-no-hero-academia-7th-season",
    title: "My Hero Academia Temporada 7",
    synopsis: "La guerra total entre los héroes profesionales de la UA y el Frente de Liberación Paranormal liderado por Tomura Shigaraki y All For One alcanza su clímax. Con la sociedad japonesa al borde del colapso, héroes extranjeros, incluida la número uno de EE. UU., Star and Stripe, se unen a la batalla definitiva.",
    coverUrl: "https://s4.anilist.co/file/anilistcdn/media/anime/cover/medium/bx163134-yieRFbvUOH9a.jpg",
    bannerUrl: "https://images3.alphacoders.com/134/1340638.jpeg",
    genres: ["Acción", "Ciencia Ficción", "Shounen", "Escolar"],
    status: "En emisión",
    rating: 8.6,
    type: "Anime",
    episodesCount: 21,
    year: 2024,
    episodes: [],
    relatedMangas: [
      {
        id: "boku-no-hero-manga",
        title: "Boku no Hero Academia (Manga)",
        synopsis: "En un mundo donde la mayoría de la población nace con dones especiales conocidos como 'Quirks', Izuku Midoriya es uno de los pocos que nace sin ninguno. A pesar de esto, sueña con convertirse en un héroe como el legendario All Might.",
        coverUrl: "https://s4.anilist.co/file/anilistcdn/media/manga/cover/medium/bx75657-PMv4teU6DuaI.jpg",
        genres: ["Acción", "Shounen", "Escolar"],
        status: "Finalizado",
        year: 2014,
        chaptersCount: 430,
        rating: 8.2
      }
    ],
    external_id: "163134",
    title_english: "My Hero Academia Season 7",
    title_romaji: "Boku no Hero Academia 7th Season"
  },

  {
    id: "frieren-beyond-journeys-end",
    title: "Sousou no Frieren (Frieren: Beyond Journey's End)",
    synopsis: "La maga elfa Frieren y sus valientes compañeros de aventura han derrotado al Rey Demonio y han traído la paz al reino. Tras el fin de la gran gesta de 10 años, todos toman rumbos separados. Para una elfa como Frieren, cuya esperanza de vida supera los miles de años, el tiempo transcurre de forma distinta. Años después, tras presenciar el funeral de su viejo amigo Himmel, Frieren lamenta no haberlo conocido mejor y emprende un viaje de autodescubrimiento y conexión humana.",
    coverUrl: "https://s4.anilist.co/file/anilistcdn/media/anime/cover/medium/bx154587-qQTzQnEJJ3oB.jpg",
    bannerUrl: "https://images4.alphacoders.com/133/1330956.png",
    genres: ["Fantasía", "Aventura", "Drama", "Recuentos de la vida"],
    status: "Finalizado",
    rating: 9.6,
    type: "Anime",
    episodesCount: 28,
    year: 2023,
    episodes: [],
    relatedMangas: [
      {
        id: "frieren-manga",
        title: "Sousou no Frieren (Manga)",
        synopsis: "El Rey Demonio ha sido derrotado, y el grupo de héroes victoriosos regresa a casa antes de disolverse. La maga elfa Frieren, cuyos años superan a los de sus compañeros, es testigo de cómo sus amigos fallecen uno por uno.",
        coverUrl: "https://s4.anilist.co/file/anilistcdn/media/manga/cover/medium/bx118586-CXKgWikBFQgS.jpg",
        genres: ["Fantasía", "Aventura", "Drama"],
        status: "En emisión",
        year: 2020,
        chaptersCount: 130,
        rating: 8.9
      }
    ],
    external_id: "154587",
    title_english: "Frieren: Beyond Journey's End",
    title_romaji: "Sousou no Frieren"
  },
  {
    id: "mushoku-tensei-ii-isekai-ittara-honki-dasu",
    title: "Mushoku Tensei: Jobless Reincarnation Season 2",
    synopsis: "Rudeus Greyrat continúa su travesía por el continente tras la separación dolorosa de Eris. Ahora en la prestigiosa Universidad de Magia de Ranoa, busca pistas sobre la misteriosa calamidad mágica que dispersó a su familia, mientras intenta sanar sus heridas emocionales y físicas y conoce a nuevos aliados y viejos conocidos disfrazados.",
    coverUrl: "https://s4.anilist.co/file/anilistcdn/media/anime/cover/medium/bx146065-IjirxRK26O03.png",
    bannerUrl: "https://images8.alphacoders.com/131/1319760.png",
    genres: ["Fantasía", "Aventura", "Isekai", "Romance", "Drama"],
    status: "Finalizado",
    rating: 8.9,
    type: "Anime",
    episodesCount: 24,
    year: 2024,
    episodes: [],
    relatedMangas: [
      {
        id: "mushoku-tensei-manga",
        title: "Mushoku Tensei (Manga)",
        synopsis: "Un NEET de 34 años muere en un accidente de tráfico y se reencarna en un mundo mágico como Rudeus Greyrat. Con sus conocimientos de su vida anterior y un talento natural para la magia, decide vivir su nueva vida al máximo.",
        coverUrl: "https://s4.anilist.co/file/anilistcdn/media/manga/cover/medium/bx85564-egXRASF0x9B9.jpg",
        genres: ["Fantasía", "Aventura", "Isekai", "Ecchi"],
        status: "En emisión",
        year: 2014,
        chaptersCount: 100,
        rating: 8.5
      }
    ],
    external_id: "146065",
    title_english: "Mushoku Tensei: Jobless Reincarnation Season 2",
    title_romaji: "Mushoku Tensei: Isekai Ittara Honki Dasu 2nd Season"
  },
  {
    id: "shingeki-no-kyojin-the-final-season",
    title: "Shingeki no Kyojin: The Final Season",
    synopsis: "El destino del mundo entero pende de un hilo cuando Eren Jaeger libera el Retumbar de la Tierra, un ejército imparable de millones de Titanes colosales destinados a pisotear toda la vida fuera de la Isla de Paradis. Sus antiguos compañeros de la Legión de Reconocimiento y los guerreros de Marley se unen en una alianza desesperada para detener el genocidio mundial.",
    coverUrl: "https://s4.anilist.co/file/anilistcdn/media/anime/cover/medium/bx110277-sKUNXAsWMNFw.jpg",
    bannerUrl: "https://images3.alphacoders.com/113/1136450.jpg",
    genres: ["Acción", "Drama", "Militar", "Misterio", "Shounen"],
    status: "Finalizado",
    rating: 9.6,
    type: "Anime",
    episodesCount: 28,
    year: 2021,
    episodes: [],
    external_id: "110277",
    title_english: "Attack on Titan: The Final Season",
    title_romaji: "Shingeki no Kyojin: The Final Season"
  },
  {
    id: "demon-slayer-kimetsu-no-yaiba-mugen-train-arc",
    title: "Kimetsu no Yaiba Temporada 2",
    synopsis: "Tanjiro Kamado y sus compañeros de la corporación de cazadores de demonios se unen al Pilar de la Llama, Kyojuro Rengoku, a bordo del Tren Infinito para investigar la misteriosa desaparición de más de 40 pasajeros, ignorando que una Luna Inferior les ha tendido una trampa mortal en sus sueños.",
    coverUrl: "https://s4.anilist.co/file/anilistcdn/media/anime/cover/medium/bx129874-g6ZKXB94Hui1.jpg",
    bannerUrl: "https://images6.alphacoders.com/112/1122606.jpg",
    genres: ["Acción", "Fantasía", "Sobrenatural", "Shounen"],
    status: "Finalizado",
    rating: 9.0,
    type: "Anime",
    episodesCount: 7,
    year: 2021,
    episodes: [],
    external_id: "129874",
    title_english: "Demon Slayer: Mugen Train Arc",
    title_romaji: "Kimetsu no Yaiba: Mugen Ressha-hen"
  },
  {
    id: "death-note",
    title: "Death Note",
    synopsis: "Light Yagami es un estudiante sobresaliente y aburrido de Japón que encuentra un misterioso cuaderno negro llamado 'Death Note', capaz de matar a cualquier persona cuyo nombre sea escrito en él. Light decide usar el cuaderno para limpiar el mundo de criminales y reinar como un dios de la justicia, desatando una batalla intelectual sin precedentes contra el mejor detective del mundo, conocido como 'L'.",
    coverUrl: "https://s4.anilist.co/file/anilistcdn/media/anime/cover/medium/bx1535-kUgkcrfOrkUM.jpg",
    bannerUrl: "https://images.alphacoders.com/941/941411.jpg",
    genres: ["Misterio", "Psicológico", "Sobrenatural", "Suspenso"],
    status: "Finalizado",
    rating: 9.5,
    type: "Anime",
    episodesCount: 37,
    year: 2006,
    episodes: [],
    external_id: "1535",
    title_english: "Death Note",
    title_romaji: "Death Note"
  },
  {
    id: "horimiya",
    title: "Horimiya",
    synopsis: "A primera vista, la popular Kyouko Hori parece una chica de secundaria frívola, pero en realidad es pragmática y está orientada a la familia. Por otro lado, el lúgubre Izumi Miyamura parece un otaku aburrido con gafas, pero en realidad es un joven atractivo con piercings y tatuajes. Cuando ambos descubren los lados ocultos del otro fuera del colegio, comienza una hermosa e íntima historia de amor.",
    coverUrl: "https://s4.anilist.co/file/anilistcdn/media/anime/cover/medium/bx124080-3i22mRVPBS0T.jpg",
    bannerUrl: "https://images4.alphacoders.com/111/1114972.jpg",
    genres: ["Romance", "Comedia", "Escolar", "Recuentos de la vida"],
    status: "Finalizado",
    rating: 8.8,
    type: "Anime",
    episodesCount: 13,
    year: 2021,
    episodes: [],
    external_id: "124080",
    title_english: "Horimiya",
    title_romaji: "Horimiya"
  },
  {
    id: "cyberpunk-edgerunners",
    title: "Cyberpunk: Edgerunners",
    synopsis: "En una metrópolis del futuro llamada Night City, plagada de corrupción y cybermodificaciones corporales, David Martinez, un chico de la calle brillante pero desamparado, decide convertirse en un 'edgerunner', un mercenario fuera de la ley también conocido como cyberpunk, para sobrevivir tras perderlo todo en un tiroteo.",
    coverUrl: "https://s4.anilist.co/file/anilistcdn/media/anime/cover/medium/bx120377-ayZPoxiWt4Li.jpg",
    bannerUrl: "https://images5.alphacoders.com/123/1239850.jpg",
    genres: ["Ciencia Ficción", "Acción", "Drama", "Seinen"],
    status: "Finalizado",
    rating: 9.2,
    type: "Anime",
    episodesCount: 10,
    year: 2022,
    episodes: [],
    external_id: "120586",
    title_english: "Cyberpunk: Edgerunners",
    title_romaji: "Cyberpunk: Edgerunners"
  },
  {
    id: "dandadan",
    title: "Dandadan",
    synopsis: "Momo Ayase es una estudiante que cree en los fantasmas pero no en los extraterrestres, mientras que su compañero de clase Ken Takakura (Okarun) cree en los extraterrestres pero no en los espíritus. Al desafiarse mutuamente a visitar lugares asociados con lo oculto y lo paranormal, ambos descubren que tanto los alienígenas como las apariciones fantasmales existen realmente, dándoles poderes extraordinarios y sumergiéndolos en batallas divertidas y bizarras para recuperar partes robadas de su anatomía.",
    coverUrl: "https://s4.anilist.co/file/anilistcdn/media/anime/cover/medium/bx171018-60q1B6GK2Ghb.jpg",
    bannerUrl: "https://images3.alphacoders.com/137/1376823.jpeg",
    genres: ["Acción", "Fantasía", "Sobrenatural", "Comedia", "Ciencia Ficción"],
    status: "Finalizado",
    rating: 9.1,
    type: "Anime",
    episodesCount: 12,
    year: 2024,
    episodes: [],
    external_id: "173044",
    title_english: "DAN DA DAN",
    title_romaji: "Dandadan"
  },
  {
    id: "bleach-sennen-kessen-hen-soukatsu-hen",
    title: "Bleach: Sennen Kessen-hen - Soukatsu-hen",
    synopsis: "La sangrienta e histórica guerra entre los Shinigami y el Quincy Wandenreich liderado por Yhwach se dirige hacia su clímax decisivo. Tras subir al Palacio del Rey de las Almas, Ichigo Kurosaki y sus aliados deben enfrentar a la guardia de élite Schutzstaffel mientras el destino de toda la existencia pende de un hilo.",
    coverUrl: "https://s4.anilist.co/file/anilistcdn/media/anime/cover/medium/bx116674-p3zK4PUX2Aag.jpg",
    bannerUrl: "https://images5.alphacoders.com/126/1261368.jpg",
    genres: ["Acción", "Fantasía", "Sobrenatural", "Shounen"],
    status: "Finalizado",
    rating: 9.3,
    type: "Anime",
    episodesCount: 13,
    year: 2024,
    episodes: [],
    external_id: "168738",
    title_english: "Bleach: Thousand-Year Blood War - The Conflict",
    title_romaji: "Bleach: Sennen Kessen-hen - Soukatsu-hen"
  },
  {
    id: "re-zero-kara-hajimeru-isekai-seikatsu-3rd-season",
    title: "Re:Zero kara Hajimeru Isekai Seikatsu 3rd Season",
    synopsis: "Un año ha transcurrido desde la victoria de Subaru Natsuki en el Santuario. El campamento de Emilia recibe una invitación de Anastasia Hoshin para visitar la ciudad de las compuertas de agua, Pristella. Sin embargo, la apacible visita se convierte en una pesadilla de proporciones apocalípticas cuando el Culto de la Bruja, liderado por múltiples Arzobispos del Pecado, toma el control de la ciudad.",
    coverUrl: "https://s4.anilist.co/file/anilistcdn/media/anime/cover/medium/bx21355-wRVUrGxpvIQQ.jpg",
    bannerUrl: "https://images7.alphacoders.com/135/1352329.png",
    genres: ["Fantasía", "Drama", "Suspenso", "Isekai"],
    status: "Finalizado",
    rating: 8.9,
    type: "Anime",
    episodesCount: 16,
    year: 2024,
    episodes: [],
    external_id: "165839",
    title_english: "Re:ZERO -Starting Life in Another World- Season 3",
    title_romaji: "Re:Zero kara Hajimeru Isekai Seikatsu 3rd Season"
  },
  {
    id: "kono-subarashii-sekai-ni-shukufuku-wo-3",
    title: "Kono Subarashii Sekai ni Shukufuku wo! 3",
    synopsis: "¡El grupo disfuncional favorito de todos está de vuelta! Tras su última aventura, Kazuma Satou recibe una carta de invitación del mismísimo Palacio Real en el Reino de Belzerg. La joven princesa Iris está fascinada por los cuentos de heroísmo de Kazuma y desea escuchar sus hazañas en persona, desencadenando nuevos malentendidos, cobardía y la magia explosiva de Megumin.",
    coverUrl: "https://s4.anilist.co/file/anilistcdn/media/anime/cover/medium/bx136804-7FVftG67FPBc.jpg",
    bannerUrl: "https://images8.alphacoders.com/135/1354024.jpeg",
    genres: ["Comedia", "Fantasía", "Aventura", "Isekai"],
    status: "Finalizado",
    rating: 9.0,
    type: "Anime",
    episodesCount: 11,
    year: 2024,
    episodes: [],
    external_id: "163321",
    title_english: "Konosuba: God's Blessing on This Wonderful World! 3",
    title_romaji: "Kono Subarashii Sekai ni Shukufuku wo! 3"
  },
  {
    id: "wistoria-wand-sword",
    title: "Wistoria: Wand and Sword",
    synopsis: "En un mundo gobernado por la magia pura, Will Serfort es un estudiante en la prestigiosa Academia Mágica Mercedes que carece por completo de la capacidad de conjurar hechizos. Sin embargo, compensa su ineptitud con una destreza con la espada y fuerza física inigualables. Will busca cumplir una promesa de la infancia de ascender a los Magia Vander utilizando solo su confiable espada.",
    coverUrl: "https://s4.anilist.co/file/anilistcdn/media/anime/cover/medium/bx170130-tvhn13WYQ2qM.jpg",
    bannerUrl: "https://images3.alphacoders.com/136/1367098.png",
    genres: ["Acción", "Fantasía", "Aventura", "Shounen"],
    status: "Finalizado",
    rating: 8.4,
    type: "Anime",
    episodesCount: 12,
    year: 2024,
    episodes: [],
    external_id: "170130",
    title_english: "Wistoria: Wand and Sword",
    title_romaji: "Tsue to Tsurugi no Wistoria"
  },
  {
    id: "blue-lock-vs-u-20-japan",
    title: "Blue Lock Season 2 (VS. U-20 Japan)",
    synopsis: "El riguroso proyecto Blue Lock avanza a su fase más crítica e impresionante. Para evitar el cierre del programa, los delanteros egoístas supervivientes de Jinpachi Ego deben enfrentarse cara a cara en un partido histórico contra la Selección Nacional de Fútbol de Japón Sub-20, capitaneada por el genio centrocampista Sae Itoshi.",
    coverUrl: "https://s4.anilist.co/file/anilistcdn/media/anime/cover/medium/bx137822-U8naszP96vzC.png",
    bannerUrl: "https://images6.alphacoders.com/136/1369792.jpeg",
    genres: ["Acción", "Deportes", "Shounen"],
    status: "Finalizado",
    rating: 8.5,
    type: "Anime",
    episodesCount: 14,
    year: 2024,
    episodes: [],
    external_id: "166584",
    title_english: "Blue Lock Season 2",
    title_romaji: "Blue Lock 2nd Season"
  },
  {
    id: "wind-breaker",
    title: "Wind Breaker",
    synopsis: "Haruka Sakura es un estudiante de secundaria marginado que solo le importa ser el peleador más fuerte y no quiere saber nada de debiluchos. Llega a la Escuela Secundaria Furin, una academia famosa por albergar a los peores delincuentes y pandilleros, pero descubre que los alumnos de Furin se han convertido en los 'Bofurin', un grupo protector del vecindario que defiende a los ciudadanos de cualquier banda externa.",
    coverUrl: "https://s4.anilist.co/file/anilistcdn/media/anime/cover/medium/bx163270-wboZJp0ybwVK.jpg",
    bannerUrl: "https://images4.alphacoders.com/135/1353272.jpeg",
    genres: ["Acción", "Drama", "Escolar"],
    status: "Finalizado",
    rating: 8.6,
    type: "Anime",
    episodesCount: 12,
    year: 2024,
    episodes: [],
    external_id: "170941",
    title_english: "Wind Breaker",
    title_romaji: "Wind Breaker"
  },
  {
    id: "tokidoki-bosotto-russia-go-de-dereru-tonari-no-alya-san",
    title: "Alya Sometimes Hides Her Feelings in Russian",
    synopsis: "Alisa 'Alya' Mikhailovna Kujou es una estudiante de origen ruso-japonés considerada la chica más bella de la escuela. Ella finge ser fría y distante, pero de vez en cuando le susurra comentarios dulces y afectuosos en ruso a su compañero de pupitre, Masachika Kuze. Lo que Alya no sospecha es que Masachika entiende perfectamente el idioma ruso.",
    coverUrl: "https://s4.anilist.co/file/anilistcdn/media/anime/cover/medium/bx162804-TBeptcAfvqTd.jpg",
    bannerUrl: "https://images3.alphacoders.com/135/1355026.png",
    genres: ["Romance", "Comedia", "Escolar"],
    status: "Finalizado",
    rating: 8.3,
    type: "Anime",
    episodesCount: 12,
    year: 2024,
    episodes: [],
    external_id: "166589",
    title_english: "Alya Sometimes Hides Her Feelings in Russian",
    title_romaji: "Tokidoki Bosotto Russia-go de Dereru Tonari no Alya-san"
  },
  {
    id: "mashle-shinka-no-kami-shiken-hen",
    title: "Mashle: Magic and Muscles Season 2",
    synopsis: "En un mundo donde la magia lo es todo y define tu valor social, Mash Burnedead continúa ocultando su completa falta de magia confiando puramente en sus músculos sobrehumanos. En esta segunda temporada, Mash participa en el temible Examen de Selección de los Visionarios Divinos mientras amenazas oscuras de Innocent Zero emergen.",
    coverUrl: "https://s4.anilist.co/file/anilistcdn/media/anime/cover/medium/bx163132-C220CO5UrTxY.jpg",
    bannerUrl: "https://images5.alphacoders.com/132/1329241.jpeg",
    genres: ["Acción", "Comedia", "Fantasía", "Shounen"],
    status: "Finalizado",
    rating: 8.6,
    type: "Anime",
    episodesCount: 12,
    year: 2024,
    episodes: [],
    external_id: "163132",
    title_english: "Mashle: Magic and Muscles - The Divine Visionary Candidate Exam Arc",
    title_romaji: "Mashle: Shinka no Kami Shiken-hen"
  },
  {
    id: "boku-no-kokoro-no-yabai-yatsu-2nd-season",
    title: "The Dangers in My Heart Season 2",
    synopsis: "Kyotaro Ichikawa es un estudiante solitario que fantasea de forma sombría sobre asesinar a la chica más popular de su clase, la hermosa modelo Anna Yamada. Sin embargo, al coincidir en la biblioteca escolar, Kyotaro descubre que Anna es sumamente risueña, despistada y glotona. A medida que se vuelven más cercanos, sus extraños impulsos se transforman en un adorable e inocente romance adolescente.",
    coverUrl: "https://s4.anilist.co/file/anilistcdn/media/anime/cover/medium/bx161645-QLbzHXiYRgV2.jpg",
    bannerUrl: "https://images8.alphacoders.com/134/1344605.png",
    genres: ["Romance", "Comedia", "Escolar"],
    status: "Finalizado",
    rating: 8.9,
    type: "Anime",
    episodesCount: 13,
    year: 2024,
    episodes: [],
    external_id: "161645",
    title_english: "The Dangers in My Heart Season 2",
    title_romaji: "Boku no Kokoro no Yabai Yatsu 2nd Season"
  },
  {
    id: "youjo-senki-1",
    title: "Youjo Senki Temporada 1",
    synopsis: "Una joven soldada que lucha en primera línea de una guerra mágica. Antes de ser ella, fue un empresario japonés que desafió a un ser misterioso llamado 'Ser X' y fue reencarnado como una niña huérfana en un mundo en guerra.",
    coverUrl: "https://s4.anilist.co/file/anilistcdn/media/anime/cover/medium/bx21613-qT3NiwYP5dYc.png",
    bannerUrl: "https://images.alphacoders.com/835/835061.jpg",
    genres: ["Acción", "Militar", "Fantasía"],
    status: "Finalizado",
    rating: 8.5,
    type: "Anime",
    episodesCount: 12,
    year: 2017,
    episodes: Array.from({ length: 12 }, (_, i) => ({
      id: `youjo-senki-1-${i + 1}`,
      title: `Episodio ${i + 1}`,
      number: i + 1,
      animeId: "youjo-senki-1",
      animeTitle: "Youjo Senki Temporada 1",
      coverUrl: "https://s4.anilist.co/file/anilistcdn/media/anime/cover/medium/bx73013-i7JqYIL4lJDo.jpg",
      videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4"
    })),
    external_id: "73013",
    title_english: "Saga of Tanya the Evil",
    title_romaji: "Youjo Senki"
  },
  {
    id: "youjo-senki-2",
    title: "Youjo Senki Temporada 2",
    synopsis: "Tanya y su batallón regresan de la guerra en el desierto para encontrarse con una nueva amenaza en el frente oriental.",
    coverUrl: "https://s4.anilist.co/file/anilistcdn/media/anime/cover/medium/bx21613-qT3NiwYP5dYc.png",
    bannerUrl: "https://images.alphacoders.com/105/1053427.jpg",
    genres: ["Acción", "Militar", "Fantasía"],
    status: "En emisión",
    rating: 8.4,
    type: "Anime",
    episodesCount: 12,
    year: 2026,
    episodes: Array.from({ length: 12 }, (_, i) => ({
      id: `youjo-senki-2-${i + 1}`,
      title: `Episodio ${i + 1}`,
      number: i + 1,
      animeId: "youjo-senki-2",
      animeTitle: "Youjo Senki Temporada 2",
      coverUrl: "https://s4.anilist.co/file/anilistcdn/media/anime/cover/medium/bx183226-rlXhTgPRnCKt.jpg",
      videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4"
    })),
    external_id: "183226",
    title_english: "Saga of Tanya the Evil Season 2",
    title_romaji: "Youjo Senki Season 2"
  },
  {
    id: "solo-leveling-2",
    title: "Solo Leveling Temporada 2",
    synopsis: "La esperada continuación del fenómeno mundial. Sung Jin-Woo, convertido en el Monarca de las Sombras, continúa su imparable ascenso mientras nuevas amenazas surgen desde las profundidades de portales de alto rango sin precedentes.",
    coverUrl: "https://s4.anilist.co/file/anilistcdn/media/anime/cover/medium/bx185875-XMvDVlIUZODx.jpg",
    bannerUrl: "https://images.alphacoders.com/134/1341100.png",
    genres: ["Acción", "Fantasía", "Aventura", "Seinen"],
    status: "En emisión",
    rating: 9.2,
    type: "Anime",
    episodesCount: 12,
    year: 2026,
    episodes: [],
    external_id: "185875",
    title_english: "Solo Leveling Season 2",
    title_romaji: "Ore dake Level Up na Ken Season 2"
  },
  {
    id: "chainsaw-man-2",
    title: "Chainsaw Man Temporada 2",
    synopsis: "La continuación de las aventuras de Denji. En esta temporada, Denji se enfrenta a la misteriosa Reze, una chica de su misma edad que parece comprender sus sentimientos, desatando un torbellino de amor y explosivos combates de nivel nacional.",
    coverUrl: "https://s4.anilist.co/file/anilistcdn/media/anime/cover/medium/bx127230-DdP4vAdssLoz.png",
    bannerUrl: "https://images2.alphacoders.com/129/1290457.jpg",
    genres: ["Acción", "Terror", "Sobrenatural", "Comedia", "Seinen"],
    status: "En emisión",
    rating: 8.9,
    type: "Anime",
    episodesCount: 12,
    year: 2026,
    episodes: [],
    external_id: "175084",
    title_english: "Chainsaw Man Season 2",
    title_romaji: "Chainsaw Man 2nd Season"
  },
  {
    id: "jujutsu-kaisen-tv-3",
    title: "Jujutsu Kaisen Temporada 3",
    synopsis: "Comienza el brutal Arco de la Extinción (Culling Game). Con Satoru Gojo sellado y Shibuya destruida, Yuji Itadori, Megumi Fushiguro y sus aliados deben ingresar a las barreras mortales del juego organizado por Kenjaku para evitar el fin del mundo del jujutsu.",
    coverUrl: "https://s4.anilist.co/file/anilistcdn/media/anime/cover/medium/bx113415-LHBAeoZDIsnF.jpg",
    bannerUrl: "https://images7.alphacoders.com/132/1325602.jpeg",
    genres: ["Acción", "Sobrenatural", "Fantasía", "Shounen"],
    status: "En emisión",
    rating: 9.3,
    type: "Anime",
    episodesCount: 16,
    year: 2026,
    episodes: [],
    external_id: "166822",
    title_english: "Jujutsu Kaisen Season 3",
    title_romaji: "Jujutsu Kaisen 3rd Season"
  },
  {
    id: "one-punch-man-3",
    title: "One Punch Man Temporada 3",
    synopsis: "La asombrosa y explosiva tercera temporada de las aventuras de Saitama y la Asociación de Héroes contra la creciente Asociación de Monstruos liderada por Orochi, con Garou alcanzando nuevos e inimaginables niveles de poder destructivo.",
    coverUrl: "https://s4.anilist.co/file/anilistcdn/media/anime/cover/medium/bx21087-B5DHjqZ3kW4b.jpg",
    bannerUrl: "https://images6.alphacoders.com/105/1052605.png",
    genres: ["Acción", "Comedia", "Parodia", "Sci-Fi"],
    status: "En emisión",
    rating: 9.0,
    type: "Anime",
    episodesCount: 12,
    year: 2026,
    episodes: [],
    external_id: "170851",
    title_english: "One Punch Man Season 3",
    title_romaji: "One Punch Man 3rd Season"
  },
  {
    id: "kimetsu-no-yaiba-mugen-jou",
    title: "Kimetsu no Yaiba Temporada 5",
    synopsis: "La culminación del fenómeno histórico. Los cazadores de demonios descienden al laberinto cambiante del Castillo Infinito para enfrentar la batalla final definitiva contra Muzan Kibutsuji y las tres Lunas Superiores restantes en combates desgarradores de vida o muerte.",
    coverUrl: "https://s4.anilist.co/file/anilistcdn/media/anime/cover/medium/bx101922-WBsBl0ClmgYL.jpg",
    bannerUrl: "https://images3.alphacoders.com/135/1355026.png",
    genres: ["Acción", "Fantasía", "Sobrenatural", "Shounen"],
    status: "En emisión",
    rating: 9.5,
    type: "Anime",
    episodesCount: 12,
    year: 2026,
    episodes: [],
    external_id: "173273",
    title_english: "Demon Slayer: Infinity Castle Arc",
    title_romaji: "Kimetsu no Yaiba: Mugen-jou-hen"
  },
  {
    id: "that-time-i-got-reincarnated-as-a-slime-1",
    title: "That Time I Got Reincarnated as a Slime Temporada 1",
    synopsis: "Satoru Mikami es un hombre de 37 años con un trabajo mediocre y descontento con su vida social. Tras morir a manos de un ladrón, se despierta en un mundo de fantasía... ¡reencarnado como un slime! Adaptándose a su nuevo y peculiar cuerpo, y bajo el nombre de Rimuru Tempest, comienza su aventura en un mundo de monstruos y magia, haciendo amigos y fundando su propia nación.",
    coverUrl: "https://s4.anilist.co/file/anilistcdn/media/anime/cover/medium/bx101280-tDxCVJm714nt.jpg",
    bannerUrl: "https://images.alphacoders.com/974/974868.jpg",
    genres: ["Acción", "Aventura", "Fantasía", "Isekai", "Comedia"],
    status: "Finalizado",
    rating: 8.4,
    type: "Anime",
    episodesCount: 24,
    year: 2018,
    episodes: [],
    external_id: "101280",
    title_english: "That Time I Got Reincarnated as a Slime",
    title_romaji: "Tensei shitara Slime Datta Ken"
  },
  {
    id: "that-time-i-got-reincarnated-as-a-slime-2",
    title: "That Time I Got Reincarnated as a Slime Temporada 2",
    synopsis: "Rimuru Tempest y sus aliados continúan construyendo la Federación Jura Tempest, un faro de paz y cooperación entre monstruos y humanos. Sin embargo, naciones humanas hostiles y antiguos Reyes Demonio observan con recelo su rápido crecimiento. Rimuru tendrá que tomar decisiones difíciles y desatar un poder devastador para proteger a sus seres queridos.",
    coverUrl: "https://s4.anilist.co/file/anilistcdn/media/anime/cover/medium/bx101280-tDxCVJm714nt.jpg",
    bannerUrl: "https://images4.alphacoders.com/111/1116675.jpg",
    genres: ["Acción", "Aventura", "Fantasía", "Isekai", "Comedia"],
    status: "Finalizado",
    rating: 8.6,
    type: "Anime",
    episodesCount: 24,
    year: 2021,
    episodes: [],
    external_id: "118586",
    title_english: "That Time I Got Reincarnated as a Slime Season 2",
    title_romaji: "Tensei shitara Slime Datta Ken 2nd Season"
  },
  {
    id: "that-time-i-got-reincarnated-as-a-slime-3",
    title: "That Time I Got Reincarnated as a Slime Temporada 3",
    synopsis: "La Federación Jura Tempest celebra su victoria contra las fuerzas de Clayman y el reconocimiento formal de Rimuru como uno de los Octagrama (los Reyes Demonio). Ahora, Rimuru busca abrir relaciones comerciales y diplomáticas con otras naciones, pero los conflictos con la Iglesia de los Santos de Occidente y la Santa Emperatriz Luminous Valentine amenazan la estabilidad de la región.",
    coverUrl: "https://s4.anilist.co/file/anilistcdn/media/anime/cover/medium/b147850-USIKDjVK7xTn.jpg",
    bannerUrl: "https://images7.alphacoders.com/136/1360155.jpg",
    genres: ["Acción", "Aventura", "Fantasía", "Isekai", "Comedia"],
    status: "Finalizado",
    rating: 8.5,
    type: "Anime",
    episodesCount: 24,
    year: 2024,
    episodes: [],
    external_id: "147850",
    title_english: "That Time I Got Reincarnated as a Slime Season 3",
    title_romaji: "Tensei shitara Slime Datta Ken 3rd Season"
  },
  {
    id: "that-time-i-got-reincarnated-as-a-slime-4",
    title: "That Time I Got Reincarnated as a Slime Temporada 4",
    synopsis: "La esperada cuarta temporada de las aventuras de Rimuru Tempest. Tras consolidar su posición como uno de los soberanos más influyentes del mundo, Rimuru y su nación Jura Tempest se enfrentan a nuevos desafíos políticos y amenazas místicas de escala continental, poniendo a prueba el gran poder de su núcleo de slime y sus leales comandantes.",
    coverUrl: "https://s4.anilist.co/file/anilistcdn/media/anime/cover/medium/bx185614-98VbrLMznQnP.png",
    bannerUrl: "https://images7.alphacoders.com/136/1360155.jpg",
    genres: ["Acción", "Aventura", "Fantasía", "Isekai", "Comedia"],
    status: "En emisión",
    rating: 8.8,
    type: "Anime",
    episodesCount: 24,
    year: 2026,
    episodes: [],
    relatedMangas: [
      {
        id: "slime-manga",
        title: "Tensei Shitara Slime Datta Ken (Manga)",
        synopsis: "Satoru Mikami es un hombre de 37 años con un trabajo mediocre y descontento con su vida social. Tras morir a manos de un ladrón, se despierta en un mundo de fantasía... ¡reencarnado como un slime!",
        coverUrl: "https://s4.anilist.co/file/anilistcdn/media/manga/cover/medium/bx114571-FizKP6E6RHVy.png",
        genres: ["Acción", "Aventura", "Fantasía", "Isekai"],
        status: "En emisión",
        year: 2015,
        chaptersCount: 115,
        rating: 8.9
      }
    ],
    external_id: "185614",
    title_english: "That Time I Got Reincarnated as a Slime Season 4",
    title_romaji: "Tensei shitara Slime Datta Ken 4th Season"
  },
  {
    id: "your-name",
    title: "Your Name (Kimi no Na wa.)",
    synopsis: "Uta, Mitsuha Miyamizu y Taki Tachibana son dos jóvenes que, a pesar de no conocerse y vivir en mundos completamente distintos, experimentan un extraño fenómeno: intercambiar sus cuerpos de manera intermitente durante el sueño.",
    coverUrl: "https://s4.anilist.co/file/anilistcdn/media/anime/cover/medium/97962-3rBcawJt63sG.jpg",
    bannerUrl: "https://images.alphacoders.com/712/712873.png",
    genres: ["Romance", "Drama", "Sobrenatural", "Fantasía"],
    status: "Finalizado",
    rating: 8.9,
    type: "Película",
    episodesCount: 1,
    year: 2016,
    episodes: [
      {
        id: "your-name-e1",
        title: "Your Name",
        number: 1,
        animeId: "your-name",
        animeTitle: "Your Name (Kimi no Na wa.)",
        releaseDate: "26 ago 2016"
      }
    ],
    external_id: "32281",
    title_english: "Your Name.",
    title_romaji: "Kimi no Na wa."
  },
  {
    id: "spirited-away",
    title: "El Viaje de Chihiro (Spirited Away)",
    synopsis: "Chihiro es una niña de diez años que, durante una mudanza con sus padres, se adentra accidentalmente en un misterioso mundo de espíritus regido por la bruja Yubaba. Para salvar a sus padres transformados en cerdos, debe trabajar en un balneario termal para dioses.",
    coverUrl: "https://s4.anilist.co/file/anilistcdn/media/anime/cover/medium/bx199-sWefXJvXkDOb.jpg",
    bannerUrl: "https://images.alphacoders.com/152/152643.jpg",
    genres: ["Aventura", "Fantasía", "Sobrenatural"],
    status: "Finalizado",
    rating: 8.8,
    type: "Película",
    episodesCount: 1,
    year: 2001,
    episodes: [
      {
        id: "spirited-away-e1",
        title: "El Viaje de Chihiro",
        number: 1,
        animeId: "spirited-away",
        animeTitle: "El Viaje de Chihiro (Spirited Away)",
        releaseDate: "20 jul 2001"
      }
    ],
    external_id: "199",
    title_english: "Spirited Away",
    title_romaji: "Sen to Chihiro no Kamikakushi"
  },
  {
    id: "howls-moving-castle",
    title: "El Increíble Castillo Vagabundo",
    synopsis: "Sophie es una joven sombrerera que cae bajo una terrible maldición de la Bruja del Páramo, convirtiéndose en una anciana de noventa años. Para buscar una cura, Sophie huye de su hogar y encuentra refugio en el Castillo Vagabundo del poderoso y misterioso mago Howl.",
    coverUrl: "https://s4.anilist.co/file/anilistcdn/media/anime/cover/medium/bx431-o8Lj3XkjHm2k.jpg",
    bannerUrl: "https://images3.alphacoders.com/791/79199.jpg",
    genres: ["Aventura", "Fantasía", "Romance"],
    status: "Finalizado",
    rating: 8.6,
    type: "Película",
    episodesCount: 1,
    year: 2004,
    episodes: [
      {
        id: "howls-moving-castle-e1",
        title: "El Increíble Castillo Vagabundo",
        number: 1,
        animeId: "howls-moving-castle",
        animeTitle: "El Increíble Castillo Vagabundo",
        releaseDate: "20 nov 2004"
      }
    ],
    external_id: "431",
    title_english: "Howl's Moving Castle",
    title_romaji: "Howl no Ugoku Shiro"
  },
  {
    id: "my-neighbor-totoro",
    title: "Mi Vecino Totoro",
    synopsis: "Dos niñas pequeñas, Satsuki y Mei, se trasladan con su padre al campo para estar cerca del hospital donde está su madre ingresada. En el bosque cercano, descubren la existencia de los Totoros, amigables espíritus del bosque que solo los niños pueden ver.",
    coverUrl: "https://s4.anilist.co/file/anilistcdn/media/anime/cover/medium/bx523-fErBvxOHP7IX.jpg",
    bannerUrl: "https://images4.alphacoders.com/181/181826.jpg",
    genres: ["Aventura", "Fantasía", "Sobrenatural", "Infantil"],
    status: "Finalizado",
    rating: 8.3,
    type: "Película",
    episodesCount: 1,
    year: 1988,
    episodes: [
      {
        id: "my-neighbor-totoro-e1",
        title: "Mi Vecino Totoro",
        number: 1,
        animeId: "my-neighbor-totoro",
        animeTitle: "Mi Vecino Totoro",
        releaseDate: "16 abr 1988"
      }
    ],
    external_id: "523",
    title_english: "My Neighbor Totoro",
    title_romaji: "Tonari no Totoro"
  },
  {
    id: "a-silent-voice",
    title: "Una Voz Silenciosa (Koe no Katachi)",
    synopsis: "La historia gira en torno a Shoya Ishida, un joven que durante la escuela primaria acosó cruelmente a Shoko Nishimiya, una nueva compañera de clase con discapacidad auditiva. Años más tarde, un atormentado Shoya emprende un viaje de redención para pedir disculpas.",
    coverUrl: "https://s4.anilist.co/file/anilistcdn/media/anime/cover/medium/bx20954-sYRfE5jQRtSB.jpg",
    bannerUrl: "https://images6.alphacoders.com/761/761044.jpg",
    genres: ["Drama", "Escolares", "Recuerdos de la vida"],
    status: "Finalizado",
    rating: 8.9,
    type: "Película",
    episodesCount: 1,
    year: 2016,
    episodes: [
      {
        id: "a-silent-voice-e1",
        title: "Una Voz Silenciosa",
        number: 1,
        animeId: "a-silent-voice",
        animeTitle: "Una Voz Silenciosa (Koe no Katachi)",
        releaseDate: "17 sep 2016"
      }
    ],
    external_id: "20954",
    title_english: "A Silent Voice",
    title_romaji: "Koe no Katachi"
  },
  {
    id: "demon-slayer-mugen-train-movie",
    title: "Kimetsu no Yaiba: Tren Infinito",
    synopsis: "Tanjiro, Nezuko, Zenitsu e Inosuke abordan el Tren Infinito para reunirse con el Pilar de la Llama, Kyojuro Rengoku, con el fin de investigar la misteriosa desaparición de numerosos pasajeros y cazar a una peligrosa Luna Demoníaca.",
    coverUrl: "https://s4.anilist.co/file/anilistcdn/media/anime/cover/medium/bx112151-1qlQwPB1RrJe.png",
    bannerUrl: "https://images5.alphacoders.com/109/1098670.jpg",
    genres: ["Acción", "Fantasía", "Sobrenatural", "Shounen"],
    status: "Finalizado",
    rating: 8.7,
    type: "Película",
    episodesCount: 1,
    year: 2020,
    episodes: [
      {
        id: "demon-slayer-mugen-train-movie-e1",
        title: "Kimetsu no Yaiba: Tren Infinito",
        number: 1,
        animeId: "demon-slayer-mugen-train-movie",
        animeTitle: "Kimetsu no Yaiba: Tren Infinito",
        releaseDate: "16 oct 2020"
      }
    ],
    external_id: "44082",
    title_english: "Demon Slayer: Mugen Train",
    title_romaji: "Kimetsu no Yaiba: Mugen Ressha-hen"
  },
  {
    id: "jujutsu-kaisen-0-movie",
    title: "Jujutsu Kaisen 0",
    synopsis: "Yuta Okkotsu es un estudiante de secundaria acosado por una terrible maldición de grado especial: el espíritu vengativo de su amiga de la infancia Rika. Para aprender a controlar este inmenso poder, es reclutado por Satoru Gojo en la Academia de Hechicería de Tokio.",
    coverUrl: "https://s4.anilist.co/file/anilistcdn/media/anime/cover/medium/bx131573-rpl82vDEDRm6.jpg",
    bannerUrl: "https://images2.alphacoders.com/119/1198531.jpg",
    genres: ["Acción", "Sobrenatural", "Fantasía", "Shounen"],
    status: "Finalizado",
    rating: 8.5,
    type: "Película",
    episodesCount: 1,
    year: 2021,
    episodes: [
      {
        id: "jujutsu-kaisen-0-movie-e1",
        title: "Jujutsu Kaisen 0",
        number: 1,
        animeId: "jujutsu-kaisen-0-movie",
        animeTitle: "Jujutsu Kaisen 0",
        releaseDate: "24 dic 2021"
      }
    ],
    external_id: "124840",
    title_english: "Jujutsu Kaisen 0",
    title_romaji: "Gekijouban Jujutsu Kaisen 0"
  },
  {
    id: "suzume-movie",
    title: "Suzume",
    synopsis: "Suzume es una joven de 17 años que vive en un pueblo tranquilo de Kyushu. Su vida cambia por completo tras encontrarse con Souta, un joven que busca puertas mágicas ocultas que amenazan con desatar grandes catástrofes en todo Japón si no son cerradas.",
    coverUrl: "https://s4.anilist.co/file/anilistcdn/media/anime/cover/medium/b141931-tb6zbHq0ZHib.png",
    bannerUrl: "https://images8.alphacoders.com/121/1217800.jpg",
    genres: ["Fantasía", "Drama", "Aventura"],
    status: "Finalizado",
    rating: 8.4,
    type: "Película",
    episodesCount: 1,
    year: 2022,
    episodes: [
      {
        id: "suzume-movie-e1",
        title: "Suzume",
        number: 1,
        animeId: "suzume-movie",
        animeTitle: "Suzume",
        releaseDate: "11 nov 2022"
      }
    ],
    external_id: "141931",
    title_english: "Suzume",
    title_romaji: "Suzume no Tojimari"
  }
];

export function getAiringBaseCount(id: string, totalCount: number = 12): number {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  // If the total episodes count is very low (e.g. less than 4), just return totalCount - 1 (min 1)
  if (totalCount <= 4) {
    return Math.max(1, totalCount - 1);
  }
  
  // Deterministic count between 50% and 90% of totalCount, with a minimum of 5 episodes
  const minEpisodes = Math.max(5, Math.floor(totalCount * 0.5));
  const maxEpisodes = Math.max(minEpisodes, Math.floor(totalCount * 0.9));
  
  if (maxEpisodes <= minEpisodes) {
    return minEpisodes;
  }
  
  return minEpisodes + (Math.abs(hash) % (maxEpisodes - minEpisodes + 1));
}

// Helper to calculate available episode count for airing animes based on the current date
// and the daily update cycle at 8:00 AM.
export function getAvailableEpisodesCountForAiring(anime: Anime): number {
  // If it's a legacy long running anime like One Piece, keep its full count
  if (anime.id === "one-piece" || anime.id.includes("reincarnated-as-a-slime") || anime.episodesCount > 50) {
    return anime.episodesCount;
  }
  
  // Base count of available episodes is deterministic per anime
  const baseCount = getAiringBaseCount(anime.id, anime.episodesCount);
  
  // Since the update is daily at 8:00 AM Eastern Time, calculate how many days have passed since July 2nd, 2026 08:00:00 Eastern Time
  const now = new Date();
  const startOffsetDate = new Date("2026-07-02T08:00:00-04:00"); // Eastern Time offset (EDT)
  
  const diffMs = now.getTime() - startOffsetDate.getTime();
  if (diffMs <= 0) {
    return baseCount;
  }
  
  // Diff in days (each day at 8:00 AM adds 1 episode)
  const diffDays = Math.floor(diffMs / (24 * 60 * 60 * 1000));
  
  return Math.min(baseCount + diffDays, anime.episodesCount);
}

// Dynamically generate episodes for all mock animes so they are fully populated and interactive
export function getAnimesWithEpisodes(): Anime[] {
  const result = MOCK_ANIMES.map((anime) => {
    let episodes: Episode[] = [];
    
    if (anime.episodes && anime.episodes.length > 0) {
      episodes = anime.episodes.map(ep => ({
        ...ep,
        videoServers: ep.videoServers && ep.videoServers.length > 0 ? ep.videoServers : [
          { name: "MegaServer 1", url: ep.videoUrl || "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4" },
          { name: "Fembed Proxy", url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4" },
          { name: "StreamTape", url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4" },
          { name: "Okru Alt", url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4" }
        ]
      }));
    } else {
      const count = anime.episodesCount; // Generate all episodes dynamically
      for (let i = 1; i <= count; i++) {
        episodes.push({
          id: `${anime.id}-${i}`,
          title: `${anime.title} - Episodio ${i}`,
          number: i,
          animeId: anime.id,
          animeTitle: anime.title,
          coverUrl: anime.coverUrl,
          // High quality legal sample streams for playback
          videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
          videoServers: [
            { name: "MegaServer 1", url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4" },
            { name: "Fembed Proxy", url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4" },
            { name: "StreamTape", url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4" },
            { name: "Okru Alt", url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4" }
          ],
          releaseDate: `${2023 + Math.floor(i / 10)}-${String((i % 12) + 1).padStart(2, "0")}-${String((i * 3 % 28) + 1).padStart(2, "0")}`
        });
      }
    }
    
    // For airing animes, slice episodes to only available ones!
    if (anime.status === "En emisión") {
      const availableCount = getAvailableEpisodesCountForAiring(anime);
      episodes = episodes.slice(0, availableCount);
    }
    
    return {
      ...anime,
      episodesCount: anime.status === "En emisión" ? episodes.length : anime.episodesCount,
      episodes: episodes
    };
  });

  // Simple heuristic to link seasons: if titles are similar or IDs share a prefix
  return result.map(anime => {
    const related = result.filter(a => 
      a.id !== anime.id && 
      (a.id.startsWith(anime.id.split('-')[0]) || anime.id.startsWith(a.id.split('-')[0])) &&
      (a.title.toLowerCase().includes(anime.title.split(' ')[0].toLowerCase()))
    );

    if (related.length > 0) {
      return {
        ...anime,
        seasons: [...(anime.seasons || []), ...related]
      };
    }
    return anime;
  });
}

export function getBaseTitle(title: string): string {
  if (!title) return "";
  
  const baseLower = title.toLowerCase().trim();
  
  // Map common alternative titles so they group perfectly across English, Spanish and Romaji
  if (
    baseLower.includes("that time i got reincarnated as a slime") || 
    baseLower.includes("tensei shitara slime datta ken") || 
    baseLower.includes("aquella vez que me reencarné en un slime") || 
    baseLower.includes("aquella vez que me reencarne en un slime")
  ) {
    return "That Time I Got Reincarnated as a Slime";
  }
  if (baseLower.includes("demon slayer") || baseLower.includes("kimetsu no yaiba")) {
    return "Kimetsu no Yaiba";
  }
  if (baseLower.includes("attack on titan") || baseLower.includes("shingeki no kyojin")) {
    return "Shingeki no Kyojin";
  }
  if (baseLower.includes("jujutsu kaisen")) {
    return "Jujutsu Kaisen";
  }
  if (baseLower.includes("chainsaw man")) {
    return "Chainsaw Man";
  }
  if (baseLower.includes("my hero academia") || baseLower.includes("boku no hero academia")) {
    return "Boku no Hero Academia";
  }
  if (baseLower.includes("solo leveling")) {
    return "Solo Leveling";
  }
  if (baseLower.includes("youjo senki") || baseLower.includes("saga of tanya the evil")) {
    return "Youjo Senki";
  }
  if (baseLower.includes("one piece")) {
    return "One Piece";
  }
  
  // General suffix cleaning
  let base = title;
  base = base.replace(/\s+Temporada\s+\d+/gi, "");
  base = base.replace(/\s+Season\s+\d+/gi, "");
  base = base.replace(/\s+Part\s+\d+/gi, "");
  base = base.replace(/\s+Parte\s+\d+/gi, "");
  base = base.replace(/\s+\d+(nd|rd|th|st)\s+Season/gi, "");
  base = base.replace(/\s+\(TV\)/gi, "");
  base = base.replace(/\s+TV\b/gi, "");
  
  // Clean double spaces or leading/trailing dashes/colons/spaces
  base = base.replace(/\s*:\s*$/, "");
  base = base.trim();
  
  return base;
}

export function groupAnimeSeasons(animes: Anime[]): Anime[] {
  if (!animes || animes.length === 0) return [];
  
  const groups: Record<string, Anime[]> = {};
  
  for (const anime of animes) {
    const base = getBaseTitle(anime.title).toLowerCase().trim();
    if (!groups[base]) {
      groups[base] = [];
    }
    groups[base].push(anime);
  }
  
  const result: Anime[] = [];
  
  for (const baseKey of Object.keys(groups)) {
    const group = groups[baseKey];
    
    // Sort the group so that the main season or season 1 comes first
    group.sort((a, b) => {
      const getSeasonNumber = (t: string) => {
        const matchTemp = t.match(/Temporada\s+(\d+)/i);
        if (matchTemp) return parseInt(matchTemp[1], 10);
        const matchSeason = t.match(/Season\s+(\d+)/i);
        if (matchSeason) return parseInt(matchSeason[1], 10);
        const matchPart = t.match(/(Part|Parte)\s+(\d+)/i);
        if (matchPart) return parseInt(matchPart[2], 10);
        return 1;
      };
      
      const sA = getSeasonNumber(a.title);
      const sB = getSeasonNumber(b.title);
      
      if (sA !== sB) return sA - sB;
      return a.year - b.year;
    });
    
    // The representative is the first one
    const representative = { ...group[0] };
    
    // If there is more than 1 season in this group, set the seasons property
    if (group.length > 1) {
      representative.seasons = group;
    }
    
    result.push(representative);
  }
  
  return result;
}

