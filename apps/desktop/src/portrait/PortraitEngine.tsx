import { useMemo, useState } from 'react';

import { Button } from '../ui/primitives/actions.js';
import type { PortraitRecipe, PortraitUpload } from '../career/types.js';

export const portraitPresets = [
  { id: 'jovem', label: 'Jovem', ageBand: 'jovem', clothing: 'casual', lighting: 'frontal suave' },
  {
    id: 'experiente',
    label: 'Experiente',
    ageBand: 'experiente',
    clothing: 'social escuro',
    lighting: 'lateral suave',
  },
  {
    id: 'classico',
    label: 'Clássico',
    ageBand: 'adulto',
    clothing: 'terno clássico',
    lighting: 'estúdio',
  },
  {
    id: 'moderno',
    label: 'Moderno',
    ageBand: 'adulto',
    clothing: 'social escuro',
    lighting: 'lateral suave',
  },
  {
    id: 'analista',
    label: 'Analista',
    ageBand: 'adulto',
    clothing: 'malha técnica',
    lighting: 'frontal suave',
  },
  {
    id: 'ex-jogador',
    label: 'Ex-jogador',
    ageBand: 'adulto',
    clothing: 'camisa esportiva',
    lighting: 'refletores',
  },
  {
    id: 'formal',
    label: 'Treinador formal',
    ageBand: 'adulto',
    clothing: 'terno clássico',
    lighting: 'estúdio',
  },
  { id: 'casual', label: 'Casual', ageBand: 'adulto', clothing: 'casual', lighting: 'natural' },
] as const;

export const defaultPortraitRecipe = (): PortraitRecipe => ({
  seed: 1,
  rendererVersion: 2,
  presentation: 'busto',
  ageBand: 'adulto',
  skinTone: 4,
  faceShape: 'oval',
  faceWidth: 50,
  jaw: 'suave',
  chin: 'médio',
  eyeShape: 'amendoado',
  eyeColor: 'castanho',
  eyebrowStyle: 'natural',
  noseStyle: 'reto',
  mouthStyle: 'neutra',
  earStyle: 'médias',
  hairStyle: 'curto',
  hairColor: 'castanho',
  facialHair: 'nenhuma',
  moustache: 'nenhum',
  bodyHairColor: 'castanho',
  wrinkles: 8,
  marks: 'nenhuma',
  glasses: false,
  accessories: [],
  clothing: 'social escuro',
  clothingColor: 'grafite',
  background: 'refletores',
  lighting: 'lateral suave',
  preset: 'moderno',
  locks: { face: false, hair: false, clothing: false, accessories: false, background: false },
});

const skinPalette = [
  '#4b2c22',
  '#62382a',
  '#794634',
  '#925944',
  '#aa6d52',
  '#c18468',
  '#d69a7c',
  '#e2ad91',
  '#edc0a5',
  '#f2cdb5',
  '#f5d8c4',
  '#f7e0d0',
];
const hairPalette: Record<string, string> = {
  preto: '#171a1a',
  castanho: '#382820',
  grisalho: '#777c7a',
  ruivo: '#7d3d28',
  loiro: '#9b7b4d',
};
const eyePalette: Record<string, string> = {
  castanho: '#4c3427',
  verde: '#48604d',
  azul: '#3f6075',
  mel: '#786039',
  cinza: '#606b70',
};
const clothingPalette: Record<string, string> = {
  grafite: '#172a2a',
  esmeralda: '#166448',
  azul: '#254b64',
  vinho: '#63343c',
  areia: '#766955',
};
const backgroundPalette: Record<string, [string, string]> = {
  refletores: ['#081918', '#164438'],
  estádio: ['#0b1c22', '#1d4d59'],
  estúdio: ['#171d1f', '#303a3c'],
  clube: ['#0a1d19', '#245845'],
  neutro: ['#171c1d', '#252d2e'],
};

const clamp = (value: number, minimum: number, maximum: number) =>
  Math.min(maximum, Math.max(minimum, value));

const hashSeed = (seed: number, salt: number) => {
  let value = (Math.trunc(seed) ^ (salt * 0x9e3779b9)) >>> 0;
  value ^= value << 13;
  value ^= value >>> 17;
  value ^= value << 5;
  return value >>> 0;
};

const pick = <Value,>(values: readonly Value[], seed: number, salt: number): Value =>
  values[hashSeed(seed, salt) % values.length]!;

export const randomizePortrait = (
  current: PortraitRecipe,
  scope: 'all' | 'face' | 'hair' | 'clothing' | 'background',
  nextSeed = hashSeed(current.seed || Date.now(), Date.now() & 0xffff),
): PortraitRecipe => {
  const all = scope === 'all';
  const face = (all || scope === 'face') && !current.locks.face;
  const hair = (all || scope === 'hair') && !current.locks.hair;
  const clothing = (all || scope === 'clothing') && !current.locks.clothing;
  const background = (all || scope === 'background') && !current.locks.background;
  return {
    ...current,
    seed: nextSeed,
    ...(face
      ? {
          skinTone: hashSeed(nextSeed, 1) % 12,
          faceShape: pick(['oval', 'quadrado', 'angular', 'redondo'], nextSeed, 2),
          faceWidth: 38 + (hashSeed(nextSeed, 3) % 28),
          jaw: pick(['suave', 'marcada', 'larga'], nextSeed, 4),
          chin: pick(['curto', 'médio', 'projetado'], nextSeed, 5),
          eyeShape: pick(['amendoado', 'aberto', 'estreito'], nextSeed, 6),
          eyeColor: pick(['castanho', 'verde', 'azul', 'mel', 'cinza'], nextSeed, 7),
          eyebrowStyle: pick(['natural', 'reta', 'marcada', 'arqueada'], nextSeed, 8),
          noseStyle: pick(['reto', 'largo', 'curto', 'angular'], nextSeed, 9),
          mouthStyle: pick(['neutra', 'sorriso discreto', 'firme'], nextSeed, 10),
          wrinkles: hashSeed(nextSeed, 11) % 42,
          marks: pick(['nenhuma', 'sarda discreta', 'cicatriz sutil'], nextSeed, 12),
        }
      : {}),
    ...(hair
      ? {
          hairStyle: pick(['curto', 'raspado', 'ondulado', 'cacheado', 'médio'], nextSeed, 13),
          hairColor: pick(['preto', 'castanho', 'grisalho', 'ruivo', 'loiro'], nextSeed, 14),
          facialHair: pick(['nenhuma', 'barba curta', 'barba cheia', 'cavanhaque'], nextSeed, 15),
          moustache: pick(['nenhum', 'discreto', 'marcado'], nextSeed, 16),
        }
      : {}),
    ...(clothing
      ? {
          clothing: pick(
            ['social escuro', 'terno clássico', 'malha técnica', 'camisa esportiva', 'casual'],
            nextSeed,
            17,
          ),
          clothingColor: pick(['grafite', 'esmeralda', 'azul', 'vinho', 'areia'], nextSeed, 18),
        }
      : {}),
    ...(background
      ? {
          background: pick(['refletores', 'estádio', 'estúdio', 'clube', 'neutro'], nextSeed, 19),
          lighting: pick(
            ['lateral suave', 'frontal suave', 'estúdio', 'natural', 'refletores'],
            nextSeed,
            20,
          ),
        }
      : {}),
  };
};

const faceGeometry = (recipe: PortraitRecipe) => {
  const width = 174 + (clamp(recipe.faceWidth, 0, 100) - 50) * 0.8;
  const shape = recipe.faceShape;
  return {
    left: 256 - width / 2,
    width,
    top: shape === 'redondo' ? 113 : 101,
    height:
      shape === 'angular' ? 238 : shape === 'quadrado' ? 224 : shape === 'redondo' ? 215 : 232,
    radius: shape === 'quadrado' ? 52 : shape === 'angular' ? 72 : 96,
  };
};

export const portraitSvg = (recipe: PortraitRecipe) => {
  const face = faceGeometry(recipe);
  const skin = skinPalette[clamp(Math.trunc(recipe.skinTone), 0, 11)]!;
  const shadowSkin = skinPalette[Math.max(0, clamp(Math.trunc(recipe.skinTone), 0, 11) - 2)]!;
  const hair = hairPalette[recipe.hairColor] ?? hairPalette.castanho!;
  const eye = eyePalette[recipe.eyeColor] ?? eyePalette.castanho!;
  const clothing = clothingPalette[recipe.clothingColor] ?? clothingPalette.grafite!;
  const [background, glow] = backgroundPalette[recipe.background] ?? backgroundPalette.refletores!;
  const eyeY = face.top + 94;
  const eyeGap = face.width * 0.23;
  const eyeWidth = recipe.eyeShape === 'aberto' ? 28 : recipe.eyeShape === 'estreito' ? 32 : 30;
  const mouthY = face.top + 174;
  const hairHeight = recipe.hairStyle === 'raspado' ? 28 : recipe.hairStyle === 'médio' ? 78 : 58;
  const beard = recipe.facialHair !== 'nenhuma';
  const fullBeard = recipe.facialHair === 'barba cheia';
  const glasses = recipe.glasses || recipe.accessories.includes('óculos');
  const mark =
    recipe.marks === 'cicatriz sutil'
      ? '<path d="M319 211l-9 22" stroke="#6f3f35" stroke-width="3" stroke-linecap="round" opacity=".55"/>'
      : recipe.marks === 'sarda discreta'
        ? '<g fill="#74483b" opacity=".42"><circle cx="215" cy="229" r="2"/><circle cx="224" cy="235" r="1.6"/><circle cx="293" cy="231" r="1.8"/><circle cx="303" cy="226" r="1.5"/></g>'
        : '';
  const wrinkles =
    recipe.wrinkles > 18
      ? `<g fill="none" stroke="${shadowSkin}" stroke-width="2" opacity="${Math.min(0.38, recipe.wrinkles / 180)}"><path d="M198 ${eyeY - 28}q18-8 38 0"/><path d="M276 ${eyeY - 28}q18-8 38 0"/></g>`
      : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" role="img" aria-label="Retrato procedural Rivallo">
<rect width="512" height="512" fill="${background}"/>
<circle cx="408" cy="80" r="176" fill="${glow}" opacity=".38"/>
<circle cx="76" cy="438" r="158" fill="#0a1112" opacity=".34"/>
<path d="M70 512c8-106 70-164 186-164s178 58 186 164" fill="${clothing}"/>
<path d="M174 512l21-124 61 48 61-48 21 124" fill="#0d191a" opacity=".45"/>
<path d="M223 322h66v88c-18 22-48 22-66 0z" fill="${skin}"/>
<ellipse cx="${face.left - 5}" cy="${eyeY + 35}" rx="19" ry="32" fill="${skin}"/>
<ellipse cx="${face.left + face.width + 5}" cy="${eyeY + 35}" rx="19" ry="32" fill="${skin}"/>
<rect x="${face.left}" y="${face.top}" width="${face.width}" height="${face.height}" rx="${face.radius}" fill="${skin}"/>
<path d="M${face.left + 14} ${face.top + 152}q18 76 68 94" fill="none" stroke="${shadowSkin}" stroke-width="8" opacity=".18"/>
<path d="M${face.left + 20} ${face.top + hairHeight}q${face.width / 2} -${hairHeight + 36} ${face.width - 40} 0v-${Math.max(10, hairHeight - 18)}q-${face.width / 2} -74 -${face.width - 40} 0z" fill="${hair}"/>
${recipe.hairStyle === 'raspado' ? `<path d="M${face.left + 23} ${face.top + 39}q${face.width / 2} -48 ${face.width - 46} 0" fill="none" stroke="${hair}" stroke-width="16" opacity=".9"/>` : ''}
<path d="M${256 - eyeGap - eyeWidth / 2} ${eyeY - 16}q${eyeWidth / 2} -10 ${eyeWidth} 0" fill="none" stroke="${hair}" stroke-width="${recipe.eyebrowStyle === 'marcada' ? 8 : 6}" stroke-linecap="round"/>
<path d="M${256 + eyeGap - eyeWidth / 2} ${eyeY - 16}q${eyeWidth / 2} -10 ${eyeWidth} 0" fill="none" stroke="${hair}" stroke-width="${recipe.eyebrowStyle === 'marcada' ? 8 : 6}" stroke-linecap="round"/>
<ellipse cx="${256 - eyeGap}" cy="${eyeY}" rx="${eyeWidth / 2}" ry="${recipe.eyeShape === 'estreito' ? 6 : 10}" fill="#f5eee8"/>
<ellipse cx="${256 + eyeGap}" cy="${eyeY}" rx="${eyeWidth / 2}" ry="${recipe.eyeShape === 'estreito' ? 6 : 10}" fill="#f5eee8"/>
<circle cx="${256 - eyeGap}" cy="${eyeY}" r="7" fill="${eye}"/><circle cx="${256 + eyeGap}" cy="${eyeY}" r="7" fill="${eye}"/>
<circle cx="${256 - eyeGap}" cy="${eyeY}" r="3" fill="#111"/><circle cx="${256 + eyeGap}" cy="${eyeY}" r="3" fill="#111"/>
${wrinkles}
<path d="M256 ${eyeY + 16}q${recipe.noseStyle === 'largo' ? -15 : -8} 38 2 55q12 8 24-1" fill="none" stroke="${shadowSkin}" stroke-width="5" stroke-linecap="round" opacity=".62"/>
<path d="M220 ${mouthY}q36 ${recipe.mouthStyle === 'sorriso discreto' ? 18 : recipe.mouthStyle === 'firme' ? 0 : 7} 72 0" fill="none" stroke="#6f3f3c" stroke-width="6" stroke-linecap="round"/>
${beard ? `<path d="M${face.left + 29} ${face.top + 157}q12 ${fullBeard ? 92 : 61} ${face.width / 2 - 29} ${face.height - 160}q${face.width / 2 - 29} -${face.height - 160} ${face.width - 58} -${face.height - 157}q-5 ${fullBeard ? 94 : 48} -${face.width / 2 - 29} ${face.height - 148}q-${face.width / 2 - 29} -45 -${face.width - 58} -${face.height - 148}z" fill="${hair}" opacity="${fullBeard ? 0.88 : 0.58}"/>` : ''}
${recipe.moustache !== 'nenhum' ? `<path d="M225 ${mouthY - 17}q31-18 62 0q-31 8-62 0" fill="${hair}" opacity=".88"/>` : ''}
${glasses ? `<g fill="none" stroke="#9fb0ad" stroke-width="6"><rect x="${256 - eyeGap - 35}" y="${eyeY - 23}" width="70" height="45" rx="14"/><rect x="${256 + eyeGap - 35}" y="${eyeY - 23}" width="70" height="45" rx="14"/><path d="M${256 - eyeGap + 35} ${eyeY - 3}h${eyeGap * 2 - 70}"/></g>` : ''}
${mark}
<path d="M194 389l62 47 62-47-19 63h-86z" fill="#e7ece8" opacity=".9"/>
<path d="M256 436v76" stroke="#091313" stroke-width="5" opacity=".45"/>
</svg>`;
};

export const portraitDataUrl = (recipe: PortraitRecipe) =>
  `data:image/svg+xml;charset=utf-8,${encodeURIComponent(portraitSvg(recipe))}`;

export function PortraitAvatar({
  recipe,
  size = 256,
  label = 'Retrato procedural',
  className,
}: {
  readonly recipe: PortraitRecipe;
  readonly size?: number;
  readonly label?: string;
  readonly className?: string;
}) {
  return (
    <img
      alt={label}
      className={className}
      height={size}
      src={portraitDataUrl(recipe)}
      width={size}
    />
  );
}

const loadPortraitImage = (recipe: PortraitRecipe) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('O retrato procedural não pôde ser rasterizado.'));
    image.src = portraitDataUrl(recipe);
  });

const rasterize = async (image: HTMLImageElement, size: number) => {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('O renderer de retratos não está disponível.');
  context.drawImage(image, 0, 0, size, size);
  const png = await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob(
      (value) => (value ? resolve(value) : reject(new Error('Falha ao finalizar retrato.'))),
      'image/png',
    ),
  );
  return [...new Uint8Array(await png.arrayBuffer())];
};

export const renderPortraitUpload = async (recipe: PortraitRecipe): Promise<PortraitUpload> => {
  const image = await loadPortraitImage(recipe);
  const [profile, card, miniCard, sidebar] = await Promise.all(
    [512, 256, 128, 64].map((size) => rasterize(image, size)),
  );
  return {
    fileName: `rivallo-portrait-${recipe.seed}.png`,
    mimeType: 'image/png',
    bytes: profile!,
    derivatives: { profile: profile!, card: card!, miniCard: miniCard!, sidebar: sidebar! },
  };
};

const selectOptions: ReadonlyArray<{
  key: keyof PortraitRecipe;
  label: string;
  options: readonly string[];
  category: string;
}> = [
  {
    key: 'faceShape',
    label: 'Formato do rosto',
    options: ['oval', 'quadrado', 'angular', 'redondo'],
    category: 'Rosto',
  },
  { key: 'jaw', label: 'Mandíbula', options: ['suave', 'marcada', 'larga'], category: 'Rosto' },
  {
    key: 'eyeShape',
    label: 'Olhos',
    options: ['amendoado', 'aberto', 'estreito'],
    category: 'Olhos',
  },
  {
    key: 'eyeColor',
    label: 'Cor dos olhos',
    options: ['castanho', 'verde', 'azul', 'mel', 'cinza'],
    category: 'Olhos',
  },
  {
    key: 'hairStyle',
    label: 'Cabelo',
    options: ['curto', 'raspado', 'ondulado', 'cacheado', 'médio'],
    category: 'Cabelo',
  },
  {
    key: 'hairColor',
    label: 'Cor do cabelo',
    options: ['preto', 'castanho', 'grisalho', 'ruivo', 'loiro'],
    category: 'Cabelo',
  },
  {
    key: 'facialHair',
    label: 'Barba',
    options: ['nenhuma', 'barba curta', 'barba cheia', 'cavanhaque'],
    category: 'Barba',
  },
  {
    key: 'clothing',
    label: 'Roupa',
    options: ['social escuro', 'terno clássico', 'malha técnica', 'camisa esportiva', 'casual'],
    category: 'Roupa',
  },
  {
    key: 'clothingColor',
    label: 'Cor da roupa',
    options: ['grafite', 'esmeralda', 'azul', 'vinho', 'areia'],
    category: 'Roupa',
  },
  {
    key: 'background',
    label: 'Fundo',
    options: ['refletores', 'estádio', 'estúdio', 'clube', 'neutro'],
    category: 'Fundo',
  },
];

export function PortraitStudio({
  recipe,
  onChange,
}: {
  readonly recipe: PortraitRecipe;
  readonly onChange: (recipe: PortraitRecipe) => void;
}) {
  const [category, setCategory] = useState('Rosto');
  const [history, setHistory] = useState<PortraitRecipe[]>([]);
  const [future, setFuture] = useState<PortraitRecipe[]>([]);
  const visibleOptions = useMemo(
    () => selectOptions.filter((option) => option.category === category),
    [category],
  );
  const commit = (next: PortraitRecipe) => {
    setHistory((current) => [...current.slice(-19), recipe]);
    setFuture([]);
    onChange(next);
  };
  return (
    <section className="portrait-studio" aria-labelledby="portrait-studio-title">
      <div className="portrait-studio__preview">
        <div>
          <h4 id="portrait-studio-title">Avatar Studio</h4>
          <p>Retrato 2D original, local e reproduzível pela receita.</p>
        </div>
        <PortraitAvatar label="Prévia grande do avatar" recipe={recipe} size={320} />
        <div className="portrait-studio__sizes" aria-label="Prévia em tamanhos do produto">
          {[128, 64, 40].map((size) => (
            <figure key={size}>
              <PortraitAvatar label={`Prévia ${size} pixels`} recipe={recipe} size={size} />
              <figcaption>{size === 128 ? 'Perfil' : size === 64 ? 'Card' : 'Sidebar'}</figcaption>
            </figure>
          ))}
        </div>
      </div>
      <div className="portrait-studio__controls">
        <div className="portrait-presets" aria-label="Presets de aparência" role="radiogroup">
          {portraitPresets.map((preset) => (
            <button
              aria-checked={recipe.preset === preset.id}
              key={preset.id}
              onClick={() => commit({ ...recipe, ...preset, preset: preset.id })}
              role="radio"
              type="button"
            >
              {preset.label}
            </button>
          ))}
        </div>
        <div className="portrait-categories" role="tablist" aria-label="Categorias do avatar">
          {['Rosto', 'Olhos', 'Cabelo', 'Barba', 'Roupa', 'Fundo'].map((item) => (
            <button
              aria-selected={category === item}
              key={item}
              onClick={() => setCategory(item)}
              role="tab"
              type="button"
            >
              {item}
            </button>
          ))}
        </div>
        <div className="portrait-option-grid">
          {category === 'Rosto' && (
            <label>
              Tom de pele
              <input
                max={11}
                min={0}
                onChange={(event) => commit({ ...recipe, skinTone: Number(event.target.value) })}
                type="range"
                value={recipe.skinTone}
              />
            </label>
          )}
          {visibleOptions.map((option) => (
            <label key={String(option.key)}>
              {option.label}
              <select
                onChange={(event) => commit({ ...recipe, [option.key]: event.target.value })}
                value={String(recipe[option.key])}
              >
                {option.options.map((value) => (
                  <option key={value}>{value}</option>
                ))}
              </select>
            </label>
          ))}
          {category === 'Olhos' && (
            <label className="checkbox-label">
              <input
                checked={recipe.glasses}
                onChange={(event) => commit({ ...recipe, glasses: event.target.checked })}
                type="checkbox"
              />{' '}
              Óculos
            </label>
          )}
        </div>
        <div className="portrait-locks" aria-label="Bloqueios de características">
          {(Object.keys(recipe.locks) as Array<keyof PortraitRecipe['locks']>).map((key) => (
            <label key={key}>
              <input
                checked={recipe.locks[key]}
                onChange={(event) =>
                  commit({ ...recipe, locks: { ...recipe.locks, [key]: event.target.checked } })
                }
                type="checkbox"
              />
              Manter{' '}
              {key === 'face'
                ? 'rosto'
                : key === 'hair'
                  ? 'cabelo'
                  : key === 'clothing'
                    ? 'roupa'
                    : key === 'accessories'
                      ? 'acessórios'
                      : 'fundo'}
            </label>
          ))}
        </div>
        <div className="portrait-studio__actions">
          <Button onClick={() => commit(randomizePortrait(recipe, 'all'))} variant="primary">
            Gerar novamente
          </Button>
          <Button onClick={() => commit(randomizePortrait(recipe, 'face'))} variant="secondary">
            Só rosto
          </Button>
          <Button onClick={() => commit(randomizePortrait(recipe, 'hair'))} variant="secondary">
            Só cabelo
          </Button>
          <Button onClick={() => commit(randomizePortrait(recipe, 'clothing'))} variant="secondary">
            Só roupa
          </Button>
          <Button
            disabled={history.length === 0}
            onClick={() => {
              const previous = history.at(-1);
              if (!previous) return;
              setHistory((current) => current.slice(0, -1));
              setFuture((current) => [recipe, ...current].slice(0, 20));
              onChange(previous);
            }}
            variant="secondary"
          >
            Desfazer
          </Button>
          <Button
            disabled={future.length === 0}
            onClick={() => {
              const next = future[0];
              if (!next) return;
              setFuture((current) => current.slice(1));
              setHistory((current) => [...current.slice(-19), recipe]);
              onChange(next);
            }}
            variant="secondary"
          >
            Refazer
          </Button>
        </div>
      </div>
    </section>
  );
}
