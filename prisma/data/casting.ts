// Casting 2026 — informações públicas do portfólio "Green Wave · Casting 2026".
export interface CastingEntry {
  name: string;
  aliases?: string[];
  instagram: string;
  originCity: string;
  originState: string;
  genres: string;
  latestRelease?: string;
  label?: string;
  bio: string;
  accent: 'green' | 'lime' | 'cream';
}

export const CASTING_2026: CastingEntry[] = [
  {
    name: 'Budang', instagram: '@budang__', originCity: 'Florianópolis', originState: 'SC', genres: 'Hardcore, Punk',
    latestRelease: 'Magia', label: 'Deck', accent: 'green',
    bio: 'Formada em Florianópolis, a Budang é um quarteto de hardcore/punk que vem ganhando espaço no underground brasileiro com shows caóticos e letras de identidade manezinha. O álbum de estreia, “Magia”, lançado pela Deck, projetou a banda nacionalmente e rendeu os prêmios de Banda Revelação do TMDQA e de Melhor Show do STU Awards.',
  },
  {
    name: 'Molho Negro', instagram: '@molhonegro', originCity: 'Belém', originState: 'PA', genres: 'Rock, Noise, Punk',
    latestRelease: 'VIDAMORTECONTEÚDO', label: 'Deck', accent: 'lime',
    bio: 'Criada em Belém do Pará, a Molho Negro mistura caos, ironia, refrões grudentos, sarcasmo e barulho. O trio lançou pela Deck o disco “VIDAMORTECONTEÚDO”, sobre hiperconectividade, excesso de telas e precarização do trabalho, e já passou por festivais como Lollapalooza, DoSol, Abril Pro Rock, Se Rasgum e Bananada.',
  },
  {
    name: 'Mukeka di Rato', instagram: '@mukekadirato_oficial', originCity: 'Vila Velha', originState: 'ES', genres: 'Hardcore',
    latestRelease: 'Generais de Fralda', label: 'Deck', accent: 'green',
    bio: 'Formada em Vila Velha (ES), a Mukeka di Rato é um dos pilares do hardcore brasileiro e referência no underground mundial, com shows pela América Latina, EUA, Europa e Japão. Em clima de comemoração, lançou pela Deck o álbum “Generais de Fralda”: rápido, sujo e direto, com letras antifascistas e participação de FBC.',
  },
  {
    name: 'Maré Tardia', instagram: '@maretardia', originCity: 'Vitória', originState: 'ES', genres: 'Surf punk, Indie rock, Pós-punk, Shoegaze',
    latestRelease: 'Sem Diversão Pra Mim', label: 'Deck', accent: 'lime',
    bio: 'Quarteto capixaba que funde surf punk, indie rock, pós-punk e shoegaze. O disco “Sem Diversão Pra Mim”, lançado pela Deck, entrou nas listas de melhores do ano de TMDQA, Popload e Hits Perdidos. Em setembro, a banda celebrou seu aniversário no palco do Rock in Rio, no Espaço Coca-Cola, a convite da Billboard Brasil.',
  },
  {
    name: 'Tropical Nada', instagram: '@tropicalnada', originCity: 'São Paulo', originState: 'SP', genres: 'Canção, Indie',
    label: 'Deck', accent: 'green',
    bio: 'Projeto musical de Daniel Furlan (Choque de Cultura, Falha de Cobertura), o Tropical Nada não é comédia, mas tem graça: canções de amor atípicas, às vezes ácidas, às vezes doces. O álbum de estreia, lançado pela Deck, começou com show esgotado no Studio SP e já rendeu turnês de casa cheia pelo Sul e pelo Sudeste.',
  },
  {
    name: 'Zepelim e o Sopro do Cão', aliases: ['Sopro do Cão'], instagram: '@soprodocao', originCity: 'Campina Grande', originState: 'PB',
    genres: 'Rock nordestino, Hardcore, Rap', latestRelease: 'Arquibancada Sol', label: 'Deck', accent: 'lime',
    bio: 'Direto de Campina Grande (PB), a Zepelim e o Sopro do Cão cruza o rock brasileiro noventista com hardcore, rap e o sotaque do interior paraibano. O novo álbum, “Arquibancada Sol”, saiu pela Deck com produção de Alexandre Capilé (Sugar Kane). A banda roda o país em turnê, com passagens pelo Bananada, Spim e BSB Punk Fest.',
  },
  {
    name: 'Swave', instagram: '@eai.swave', originCity: 'São Paulo', originState: 'SP', genres: 'Rock alternativo, Grunge, Punk rock',
    latestRelease: 'foi o que deu pra fazer', label: 'Deck', accent: 'green',
    bio: 'Quinteto paulistano que transita pelo rock alternativo, grunge e punk-rock da virada do milênio, com guitarras afiadas e letras em português. Depois de uma demo em K7 esgotada na pré-venda, lançou pela Deck o álbum “foi o que deu pra fazer” e rodou o Brasil por festivais como Porão do Rock, DoSol, Goiânia Noise e Crossroads.',
  },
  {
    name: 'Roberta de Razão', instagram: '@roberta_derazao', originCity: 'Vila Velha', originState: 'ES', genres: 'Punk brega psicolésbico',
    latestRelease: 'Mais Forte Que Trovão', accent: 'lime',
    bio: 'De Vila Velha (ES), Roberta de Razão criou o próprio gênero, o punk brega psicolésbico, que mistura punk, pós-punk, brega, cumbia, electro, lambada, new wave e carimbó, com performance de maquiagem, figurino e adereços fortes. Com o álbum “Mais Forte Que Trovão”, passou por TendaLab, Se Rasgum, Goiânia Noise e Coletiva REBU.',
  },
  {
    name: 'DFC', instagram: '@dfchaos', originCity: 'Brasília', originState: 'DF', genres: 'Hardcore', accent: 'green',
    bio: 'Formada em Brasília, a DFC (Distrito Federal Caos) é referência da música pesada no Brasil, com hardcore rápido e sarcasmo político nas letras. Na estrada sem pausa desde a criação, dividiu o palco com Ratos de Porão, Sepultura, Suicidal Tendencies, D.R.I. e Agnostic Front, e tem discos lançados em vários países e turnê pela Europa.',
  },
  {
    name: 'Basttardz', instagram: '@basttardzhc', originCity: 'São Luís', originState: 'MA', genres: 'Hardcore, Rap',
    latestRelease: 'Tramas & Traumas', label: 'Brisa Discos', accent: 'lime',
    bio: 'Manifesto musical da Ilha do Caos, como também é conhecida São Luís (MA), a Basttardz une o peso do hardcore à linguagem urbana do rap nacional. Uma das principais bandas da música de protesto do Nordeste, já rodou todas as regiões do país com a turnê “Hardcore Tropical” e divulga o novo álbum, “Tramas & Traumas”, pela Brisa Discos.',
  },
  {
    name: 'Meu Funeral', instagram: '@meufuneral', originCity: 'Rio de Janeiro', originState: 'RJ', genres: 'Pop-punk, Música brasileira', accent: 'green',
    bio: 'Banda carioca que parte do pop-punk dos anos 90 da geração MTV e mistura elementos da música brasileira, com letras divertidas, sinceras e cotidianas embaladas por refrões pop. Fala de amor, mortalidade e injustiça com bom humor, em shows explosivos que já passaram pelo Rock in Rio, Circo Voador, DoSol e Crossroads, e soma feats com Xande de Pilares, Jimmy London e Tati Quebra Barraco.',
  },
  {
    name: 'Leptospirose', instagram: '@banda_leptospirose', originCity: 'Bragança Paulista', originState: 'SP', genres: 'Hardcore, Jazz, Progressivo',
    latestRelease: 'Aqua Mad Max', accent: 'lime',
    bio: 'Formado em Bragança Paulista (SP), o trio Leptospirose faz um hardcore rápido com fortes influências do jazz, da música atonal e do rock progressivo, em músicas de cerca de um minuto. Já tocou em todas as regiões do país, em festivais como Abril Pro Rock, DoSol, Goiânia Noise e Porão do Rock, e passou por Argentina, Uruguai e Europa. O disco “Aqua Mad Max” foi produzido por Juninho, do Ratos de Porão, e a banda prepara um novo álbum.',
  },
];
