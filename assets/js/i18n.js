/* HORIN — i18n EN/PL.
   EN живёт в разметке как дефолт (SEO), словарь подменяет innerHTML по
   data-i18n и placeholder по data-i18n-ph. Смена языка: тексты гаснут,
   спираль фото ныряет вниз (event 'horin:langdip' слушает scene.js),
   подмена, тексты проявляются, спираль поднимается. */

(() => {
  const DICT = {
    en: {
      'title.index': 'HORIN — Deformed in Concrete',
      'title.contact': 'Contact — HORIN',

      'hdr.project': 'Deformed<br>in concrete',
      'hdr.sub': 'Project',
      'nav.contact': 'Contact',
      'nav.collection': 'Collection',

      'hero.title': 'Deformed in&nbsp;concrete',
      'hero.by': 'Project by HORIN',
      'hero.no': 'Collection N°1',
      'hero.hint': 'Scroll to descend',

      'man.vertical': 'Manifest',
      'man.kicker': 'Collection N°1 — Womenswear',
      'man.title': 'The collection',
      'man.text':
        '<p>A womenswear collection inspired by Brutalism, characterized by geometric shapes, strong lines, and textures that reference the rawness of concrete, softened by subtle details that add depth and character to the designs. The color palette is based on shades of grey, muted beige tones, and deep blacks, emphasizing the architectural and minimalist nature of the silhouettes.</p>' +
        '<p>The collection is also rooted in the designer&rsquo;s personal emotions and individual relationship with architecture. It represents an interpretation of the environment in which he grew up and an attempt to translate experiences related to its austerity, monumentality, and atmosphere into the language of clothing. The project seeks to build a bridge between the architectural and the personal; between structure and emotion, and between form and its conscious deconstruction.</p>' +
        '<p>Through the deformation and reinterpretation of classic wardrobe elements, the collection aims to challenge the traditional notion of clothing, much like the grey, concrete urban landscape shaped the designer&rsquo;s identity and perception of form, becoming not only the backdrop of his upbringing but also a source of emotions and inspiration.</p>',

      'lk1.vertical': 'Modules',
      'lk1.kicker': 'Look 01 / 06',
      'lk1.title': 'Modular repetition',
      'lk1.text':
        '<p>Look 1 consists of a blazer and trousers, with the repeated sleeve motif serving as its main structural element. The triple-sleeve construction creates a rounded shoulder shape while emphasizing the waist through the fitted center of the blazer and the deliberate distortion of proportions around the shoulders. This treatment gives the silhouette a sculptural, architectural character. The rounded sleeve cap also references the characteristic arches found in Soviet modernist architecture.</p>' +
        '<p>The silhouette was created through a process of deconstruction based on deforming and reconnecting elements of a classic suit. One of the striped sleeves refers to Soviet architecture, symbolizing repetitive apartment blocks that differ only in color. It becomes a metaphor for the illusion of diversity within a uniform and repetitive structure.</p>',

      'lk2.vertical': 'Geometry',
      'lk2.kicker': 'Look 02 / 06',
      'lk2.title': 'Geometry &amp; layering',
      'lk2.text':
        '<p>Look 2 is based on simple geometric shapes that give the silhouette a distinctly structural character. Leaving the sides of the blazer open and unstitched causes both the garment and the silhouette to lose their traditional, closed form, becoming more geometric and spatial. The overlapping layers and elements reference Brutalist architecture, where volumes intersect to create complex, multi-level compositions. This approach relates to the architecture present in the environment of the designer&rsquo;s upbringing, perceived as a system of raw, repetitive structures shaping the surrounding space.</p>',

      'lk3.vertical': 'Concrete',
      'lk3.kicker': 'Look 03 / 06',
      'lk3.title': 'Greyness',
      'lk3.text':
        '<p>Look 3 references the greyness and rawness of concrete, serving as a direct reflection of Brutalist architecture. As in the previous silhouettes, the concept of repetition appears through the multiplication of elements such as trousers and collars, as well as through layered constructions and overlapping forms. These overlapping elements create a sense of weight and structure, evoking associations with monumental concrete architectural volumes.</p>' +
        '<p>In line with the concept of the collection, this silhouette acts as a contrast to the second look. Instead of sharp geometric lines, more rounded shapes emerge, softening the overall form while maintaining the layered construction and architectural character that define the collection.</p>',

      'lk4.vertical': 'Monument',
      'lk4.kicker': 'Look 04 / 06',
      'lk4.title': 'Soviet references',
      'lk4.text':
        '<p>Look 4 marks a turning point in the collection, introducing sharper and more geometric forms. The construction of the blazer creates a sense of volume and weight, referencing the monumentality of Brutalist architecture.</p>' +
        '<p>The sleeves were inspired by the shape of Soviet concrete fences. The use of shirt elements as sleeves further emphasizes the sharpness of the form, while collars placed at the ends of the sleeves create distinct geometric finishes. Their inversion symbolizes a desire for change and a search for diversity within Soviet modernist architecture.</p>' +
        '<p>The blazer pockets, relocated onto the trousers, reference the forms of staircases found in residential apartment blocks. Combined with inserted fabric panels that open up the silhouette, they evoke the arched architectural solutions characteristic of both Brutalism and Soviet modernism. The colour palette is inspired by the brown tones of Soviet housing blocks, reinforcing the raw and architectural character of the look.</p>',

      'lk5.vertical': 'Contrast',
      'lk5.kicker': 'Look 05 / 06',
      'lk5.title': 'Structural exploration',
      'lk5.text':
        '<p>Look 5 draws inspiration from a fusion of sharp, geometric forms characteristic of Brutalist and Soviet architecture. The juxtaposition of these two aesthetics becomes both a comparison and a contrast, revealing the tension between similar formal qualities and differing cultural contexts.</p>' +
        '<p>The triangular-shaped trousers disrupt the traditional perception of silhouette through the deconstruction of a classic cut. The construction has been reinforced with metal wire, which allows it to maintain its geometric form and gives the design a sculptural, architectural character. This intervention emphasizes a departure from the natural line of the body in favor of a deliberately constructed, structural silhouette.</p>',

      'lk6.vertical': 'Tension',
      'lk6.kicker': 'Look 06 / 06',
      'lk6.title': 'Asymmetry',
      'lk6.text':
        '<p>Look 6, through its asymmetry, forms a clear opposition to all previous designs, directly referencing the core principles of the collection, which are based on the tension between repetition and difference. The departure from a symmetrical construction disrupts the established compositional order, introducing dynamism and ambiguity of form.</p>' +
        '<p>The curved, sharp-edged shapes at the ends intensify the expressive character of the silhouette, while the tension within the fabric creates the impression of movement suspended in space, giving the design a sculptural quality. Asymmetry also becomes a tool for exploring new garment forms and functions through the deconstruction of classic wardrobe elements.</p>' +
        '<p>The blazer has been transformed into an asymmetrical top, as has the shirt, which has taken on a corset-like structure, redefining the original purpose of the garment. From the trousers, a skirt has been created, in which the crotch elements have been stitched together in a way that exposes the construction and reconfigures the inserted fabric segments into stripe-like forms.</p>' +
        '<p>This approach reveals the process of transformation and preserves visible traces of the original structure, establishing a dialogue between the garment&rsquo;s former function and its new, reconfigured identity.</p>',

      'outro.kicker': 'The collection is a cast — see it in person',
      'outro.link': 'Contact',
      'outro.brand': 'HORIN — Deformed in concrete',

      'lb.close': 'Close',

      'c.vertical': 'Contact',
      'c.intro':
        'Collaborations, private orders, press &amp; showroom requests. ' +
        'Leave a message — the atelier replies personally.',
      'f.name': 'Name',
      'f.name.ph': 'Your name',
      'f.email': 'Email',
      'f.email.ph': 'you@mail.com',
      'f.subject': 'Subject',
      'pill.collab': 'Collaboration',
      'pill.order': 'Private order',
      'pill.press': 'Press',
      'pill.other': 'Other',
      'f.msg': 'Message',
      'f.msg.ph': 'Tell the atelier what you have in mind…',
      'f.send': 'Send <span class="s-arrow">→</span>',
      'f.note': 'HORIN atelier<br>Deformed in concrete — Collection N°1',
      'cs.title': 'Received',
      'cs.sub': 'The atelier will reply personally',
      'cs.back': 'Back to the collection',
    },

    pl: {
      'title.index': 'HORIN — Deformed in Concrete',
      'title.contact': 'Kontakt — HORIN',

      'hdr.project': 'Deformed<br>in concrete',
      'hdr.sub': 'Projekt',
      'nav.contact': 'Kontakt',
      'nav.collection': 'Kolekcja',

      'hero.title': 'Deformed in&nbsp;concrete',
      'hero.by': 'Projekt HORIN',
      'hero.no': 'Kolekcja N°1',
      'hero.hint': 'Przewiń, by zejść niżej',

      'man.vertical': 'Manifest',
      'man.kicker': 'Kolekcja N°1 — Damska',
      'man.title': 'Kolekcja',
      'man.text':
        '<p>Kolekcja damska inspirowana brutalizmem, w której dominują geometryczne kształty, mocne linie oraz tekstury nawiązujące do surowości betonu, przełamane subtelnymi detalami nadającymi projektom głębię i charakter. Kolorystyka opiera się na palecie szarości, stonowanych beżach oraz głębokich czerniach, podkreślających architektoniczny i minimalistyczny charakter sylwetek.</p>' +
        '<p>Kolekcja oparta jest również na osobistych emocjach oraz indywidualnym stosunku projektanta do architektury. Stanowi interpretację przestrzeni, w której dorastał, oraz próbę przełożenia doświadczeń związanych z jej surowością, monumentalnością i atmosferą na język ubioru. Projekt jest próbą zbudowania pomostu pomiędzy tym, co architektoniczne, a tym, co osobiste; pomiędzy strukturą a emocją oraz pomiędzy formą a jej świadomą dekonstrukcją.</p>' +
        '<p>Poprzez deformację i reinterpretację klasycznych elementów garderoby kolekcja dąży do zniekształcenia tradycyjnego pojęcia ubioru, podobnie jak szara, betonowa przestrzeń miasta kształtowała tożsamość i sposób postrzegania formy, stając się nie tylko tłem dorastania, lecz także źródłem emocji i inspiracji.</p>',

      'lk1.vertical': 'Moduły',
      'lk1.kicker': 'Sylwetka 01 / 06',
      'lk1.title': 'Powtarzalność modułów',
      'lk1.text':
        '<p>W pierwszej sylwetce, składającej się z marynarki i spodni, głównym elementem konstrukcyjnym jest powtarzalny motyw rękawa. Potrójna forma rękawów buduje zaokrąglony kształt ramion, jednocześnie podkreślając talię poprzez dopasowanie marynarki i celowe zaburzenie proporcji w obrębie barków. Zabieg ten nadaje sylwetce rzeźbiarski, architektoniczny charakter. Zaokrąglona forma główki rękawa nawiązuje do łuków charakterystycznych dla architektury radzieckiego modernizmu.</p>' +
        '<p>Sylwetka powstała w procesie dekonstrukcji, opartej na deformowaniu i ponownym łączeniu elementów klasycznego garnituru. Jeden z rękawów, wykonany w paski, stanowi odniesienie do architektury radzieckiej. Symbolizuje on powtarzalne bloki mieszkalne różniące się jedynie kolorem, stając się metaforą pozornej różnorodności w obrębie jednolitej struktury.</p>',

      'lk2.vertical': 'Geometria',
      'lk2.kicker': 'Sylwetka 02 / 06',
      'lk2.title': 'Geometria i warstwowość',
      'lk2.text':
        '<p>Druga sylwetka opiera się na prostych, geometrycznych kształtach, które nadają jej wyraźnie strukturalny charakter. Pozostawienie otwartych, niezszytych boków marynarki sprawia, że zarówno sylwetka, jak i sam element odzieży tracą swój tradycyjny, zamknięty kształt, stając się bardziej geometryczne i przestrzenne. Nachodzące na siebie warstwy i elementy nawiązują do architektury brutalistycznej, w której bryły przenikają się, tworząc wielopoziomowe kompozycje. Zabieg ten odnosi się do architektury obecnej w przestrzeni dorastania, postrzeganej jako układ surowych, powtarzalnych struktur kształtujących otoczenie.</p>',

      'lk3.vertical': 'Beton',
      'lk3.kicker': 'Sylwetka 03 / 06',
      'lk3.title': 'Szarość',
      'lk3.text':
        '<p>Trzecia sylwetka nawiązuje do szarości i surowości betonu, stanowiących bezpośrednie odniesienie do estetyki architektury brutalistycznej. Podobnie jak w poprzednich sylwetkach, pojawia się motyw powtarzalności elementów konstrukcyjnych, widoczny w multiplikacji form spodni i kołnierzy oraz w warstwowym układzie nachodzących na siebie części. Nakładające się elementy budują wrażenie ciężaru i strukturalności, przywołując skojarzenia z betonowymi bryłami architektonicznymi.</p>' +
        '<p>Zgodnie z założeniami kolekcji sylwetka stanowi kontrast wobec drugiej. Zamiast ostrych, geometrycznych linii pojawiają się bardziej zaokrąglone kształty, które łagodzą formę, zachowując jednocześnie charakterystyczną dla kolekcji warstwowość i architektoniczny charakter.</p>',

      'lk4.vertical': 'Monument',
      'lk4.kicker': 'Sylwetka 04 / 06',
      'lk4.title': 'Inspiracje radzieckie',
      'lk4.text':
        '<p>Czwarta sylwetka stanowi moment przełomowy w kolekcji, wprowadzając bardziej ostre i geometryczne formy. Konstrukcja marynarki buduje wrażenie objętości oraz ciężaru, nawiązując do monumentalności architektury brutalistycznej.</p>' +
        '<p>Rękawy marynarki zostały zainspirowane kształtem radzieckich betonowych ogrodzeń. Wykorzystanie koszul jako ich elementów dodatkowo podkreśla ostrość formy — kołnierze umieszczone u dołu rękawów tworzą wyraźne, geometryczne zakończenia. Ich odwrócenie symbolizuje potrzebę zmiany oraz poszukiwanie różnorodności w obrębie radzieckiego modernizmu.</p>' +
        '<p>Kieszenie marynarki przeniesione na spodnie nawiązują do form klatek schodowych w blokach mieszkalnych. Połączenie ich z wszytym materiałem otwierającym konstrukcję przywołuje łukowe rozwiązania architektoniczne charakterystyczne dla brutalizmu i radzieckiego modernizmu. Kolorystyka sylwetki inspirowana jest brązową tonacją radzieckich bloków mieszkalnych, podkreślając jej surowy i architektoniczny charakter.</p>',

      'lk5.vertical': 'Kontrast',
      'lk5.kicker': 'Sylwetka 05 / 06',
      'lk5.title': 'Rozwinięcie konstrukcji',
      'lk5.text':
        '<p>Piąta sylwetka czerpie inspirację z połączenia ostrych, geometrycznych form charakterystycznych dla architektury brutalistycznej i radzieckiej. Zestawienie tych dwóch estetyk staje się jednocześnie ich porównaniem i przeciwstawieniem, ukazując napięcie pomiędzy podobieństwem form a odmiennym kontekstem kulturowym.</p>' +
        '<p>Spodnie o trójkątnym kształcie zaburzają tradycyjne postrzeganie sylwetki poprzez dekonstrukcję klasycznego kroju. Konstrukcja została wzmocniona metalowym drutem, który pozwala utrzymać geometryczną formę i nadaje projektowi rzeźbiarski, architektoniczny charakter. Zabieg ten podkreśla odejście od naturalnej linii ciała na rzecz świadomie budowanej, strukturalnej sylwetki.</p>',

      'lk6.vertical': 'Napięcie',
      'lk6.kicker': 'Sylwetka 06 / 06',
      'lk6.title': 'Asymetria',
      'lk6.text':
        '<p>Szósta sylwetka poprzez swoją asymetrię stanowi wyraźne przeciwstawienie wszystkich poprzednich projektów, bezpośrednio odnosząc się do głównych założeń kolekcji opartych na napięciu między powtarzalnością a różnicą. Odejście od symetrycznej konstrukcji zaburza dotychczasowy porządek kompozycyjny, wprowadzając dynamikę oraz niejednoznaczność formy.</p>' +
        '<p>Wygięte na końcach, ostre kształty wzmacniają ekspresyjny charakter sylwetki, a napięcia materiału budują wrażenie ruchu zatrzymanego w przestrzeni, nadając projektowi rzeźbiarską jakość. Asymetria staje się również narzędziem poszukiwania nowych form ubioru i jego funkcji poprzez dekonstrukcję klasycznych elementów garderoby.</p>' +
        '<p>Marynarka została przekształcona w asymetryczny top, podobnie jak koszula, która przyjęła formę konstrukcji nawiązującej do gorsetu, redefiniując pierwotne przeznaczenie odzieży. Ze spodni powstała spódnica, w której elementy kroku zszyto w sposób eksponujący konstrukcję oraz przekształcający wszyte fragmenty materiału w formy przypominające pasy.</p>' +
        '<p>Zabieg ten ujawnia proces transformacji i pozostawia widoczne ślady pierwotnej struktury, budując dialog pomiędzy dawną funkcją ubrania a jego nową, przekształconą tożsamością.</p>',

      'outro.kicker': 'Kolekcja jest odlewem — zobacz ją na żywo',
      'outro.link': 'Kontakt',
      'outro.brand': 'HORIN — Deformed in concrete',

      'lb.close': 'Zamknij',

      'c.vertical': 'Kontakt',
      'c.intro':
        'Współprace, zamówienia prywatne, prasa i showroom. ' +
        'Zostaw wiadomość — atelier odpowiada osobiście.',
      'f.name': 'Imię',
      'f.name.ph': 'Twoje imię',
      'f.email': 'E-mail',
      'f.email.ph': 'ty@mail.com',
      'f.subject': 'Temat',
      'pill.collab': 'Współpraca',
      'pill.order': 'Zamówienie prywatne',
      'pill.press': 'Prasa',
      'pill.other': 'Inne',
      'f.msg': 'Wiadomość',
      'f.msg.ph': 'Napisz atelier, co masz na myśli…',
      'f.send': 'Wyślij <span class="s-arrow">→</span>',
      'f.note': 'Atelier HORIN<br>Deformed in Concrete — Kolekcja N°1',
      'cs.title': 'Otrzymano',
      'cs.sub': 'Atelier odpowie osobiście',
      'cs.back': 'Wróć do kolekcji',
    },
  };

  const KEY = 'horin-lang';
  const store = {
    get() { try { return localStorage.getItem(KEY); } catch { return null; } },
    set(v) { try { localStorage.setItem(KEY, v); } catch { /* private mode */ } },
  };

  let lang = store.get();
  if (!DICT[lang]) lang = 'en';

  const targets = () => [...document.querySelectorAll('[data-i18n], [data-i18n-ph]')];

  function apply(l) {
    const d = DICT[l];
    document.documentElement.lang = l;
    targets().forEach((el) => {
      const k = el.dataset.i18n;
      if (k && d[k] != null) el.innerHTML = d[k];
      const pk = el.dataset.i18nPh;
      if (pk && d[pk] != null) el.placeholder = d[pk];
    });
    const titleKey = document.body.classList.contains('contact-page')
      ? 'title.contact' : 'title.index';
    document.title = d[titleKey];
    document.querySelectorAll('.ls-btn').forEach((b) => {
      b.classList.toggle('is-on', b.dataset.lang === l);
    });
  }

  const dip = (v) => dispatchEvent(new CustomEvent('horin:langdip', { detail: v }));

  let busy = false;
  function setLang(l) {
    if (l === lang || busy || !DICT[l]) return;
    busy = true;
    lang = l;
    store.set(l);
    dip(1); // спираль уходит вниз
    const els = targets();
    els.forEach((el) => {
      el.style.transition = 'opacity 0.38s ease';
      el.style.opacity = '0';
    });
    setTimeout(() => {
      apply(l);
      els.forEach((el) => { el.style.opacity = '1'; });
      setTimeout(() => {
        dip(0); // спираль возвращается
        els.forEach((el) => { el.style.transition = ''; el.style.opacity = ''; });
        busy = false;
      }, 420);
    }, 440);
  }

  document.addEventListener('click', (e) => {
    const b = e.target.closest('.ls-btn');
    if (b) setLang(b.dataset.lang);
  });

  apply(lang); // на загрузке — мгновенно, без анимации
})();
