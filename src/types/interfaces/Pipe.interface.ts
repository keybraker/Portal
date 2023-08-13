import voca from 'voca';
import { InterfaceBlueprint } from '../classes/PTypes.interface';
import { AuthType } from '../enums/Admin.enum';

export const PIPE_PREFIX = '|';

export const PipeBlueprints: InterfaceBlueprint[] = [
  {
    name: 'acronym',
    hover: 'make acronym',
    get: (str: string | string[]): string => {
      return typeof str === 'string'
        ? isAcronym(str)
          ? str
          : str
            .replace(/[-_,.:*=+]/g, ' ')
            .split(' ')
            .map((s) => s[0])
            .join('')
        : typeof str === 'object'
          ? str
            .map((s) =>
              s
                .replace(/[-_,.:*=+]/g, ' ')
                .split(' ')
                .map((sm) => (isAcronym(sm) ? sm : sm[0]))
                .join('')
            )
            .join(',')
          : str;
    },
    set: null,
    auth: AuthType.none,
  },
  {
    name: 'vowels',
    hover: 'keep only vowels',
    get: (str: string | string[]): string => {
      return typeof str === 'string'
        ? getVowels(str).join('')
        : typeof str === 'object'
          ? str.map((s) => getVowels(s).join('')).join(',')
          : str;
    },
    set: null,
    auth: AuthType.none,
  },
  {
    name: 'consonants',
    hover: 'keep only consonants',
    get: (str: string | string[]): string => {
      return typeof str === 'string'
        ? getConstants(str).join('')
        : typeof str === 'object'
          ? str.map((s) => getConstants(s).join('')).join(',')
          : str;
    },
    set: null,
    auth: AuthType.none,
  },
  {
    name: 'camelCase',
    hover: 'make to camel Case',
    get: (str: string | string[]): string => {
      return typeof str === 'string'
        ? voca.camelCase(str)
        : typeof str === 'object'
          ? str.map((s) => voca.camelCase(s)).join(',')
          : str;
    },
    set: null,
    auth: AuthType.none,
  },
  {
    name: 'capitalise',
    hover: 'make first characters upper case',
    get: (str: string | string[]): string => {
      return typeof str === 'string'
        ? voca.capitalize(str)
        : typeof str === 'object'
          ? str.map((s) => voca.capitalize(s)).join(',')
          : str;
    },
    set: null,
    auth: AuthType.none,
  },
  {
    name: 'decapitalise',
    hover: 'make first characters lower case',
    get: (str: string | string[]): string => {
      return typeof str === 'string'
        ? voca.decapitalize(str)
        : typeof str === 'object'
          ? str.map((s) => voca.decapitalize(s)).join(',')
          : str;
    },
    set: null,
    auth: AuthType.none,
  },
  {
    name: 'lowerCase',
    hover: 'make all characters lower case',
    get: (str: string | string[]): string => {
      return typeof str === 'string'
        ? voca.lowerCase(str)
        : typeof str === 'object'
          ? str.map((s) => voca.lowerCase(s)).join(',')
          : str;
    },
    set: null,
    auth: AuthType.none,
  },
  {
    name: 'upperCase',
    hover: 'make all characters upper case',
    get: (str: string | string[]): string => {
      return typeof str === 'string'
        ? voca.upperCase(str)
        : typeof str === 'object'
          ? str.map((s) => voca.upperCase(s)).join(',')
          : str;
    },
    set: null,
    auth: AuthType.none,
  },
  {
    name: 'populous_count',
    hover: 'frequency of most popular item',
    get: (str: string | string[]): number => {
      return typeof str === 'string' ? 1 : typeof str === 'object' ? <number>mostFrequent(str, true) : str;
    },
    set: null,
    auth: AuthType.none,
  },
  {
    name: 'populous',
    hover: 'most popular item',
    get: (str: string | string[]): string => {
      return typeof str === 'string' ? str : typeof str === 'object' ? <string>mostFrequent(str, false) : str;
    },
    set: null,
    auth: AuthType.none,
  },
  {
    name: 'snakeCase',
    hover: 'replace space with _',
    get: (str: string | string[]): string => {
      return typeof str === 'string'
        ? voca.snakeCase(str)
        : typeof str === 'object'
          ? str.map((s) => voca.snakeCase(s)).join(',')
          : str;
    },
    set: null,
    auth: AuthType.none,
  },
  {
    name: 'souvlakiCase',
    hover: 'replace space with -',
    get: (str: string | string[]): string => {
      return typeof str === 'string'
        ? voca.kebabCase(str)
        : typeof str === 'object'
          ? str.map((s) => voca.kebabCase(s)).join(',')
          : str;
    },
    set: null,
    auth: AuthType.none,
  },
  {
    name: 'words',
    hover: 'get the number of words',
    get: (str: string | string[]): number => {
      return typeof str === 'string'
        ? voca.words(str).length
        : typeof str === 'object'
          ? voca.words(str.join(' ')).length
          : str;
    },
    set: null,
    auth: AuthType.none,
  },
  {
    name: 'titleCase',
    hover: 'make the first letter upper case and rest lower',
    get: (str: string | string[]): string => {
      return typeof str === 'string'
        ? voca.titleCase(str)
        : typeof str === 'object'
          ? str.map((s) => voca.titleCase(s)).join(',')
          : str;
    },
    set: null,
    auth: AuthType.none,
  },
  {
    name: 'length',
    hover: 'get length',
    get: (str: string | string[]): number => {
      return typeof str === 'string' ? str.length : typeof str === 'object' ? str.join(',').length : str;
    },
    set: null,
    auth: AuthType.none,
  },
];

export function isPipe(candidate: string): string {
  for (let i = 0; i < PipeBlueprints.length; i++) {
    const subString = String(candidate).substring(1, String(PipeBlueprints[i].name).length + 1);

    if (subString == PipeBlueprints[i].name) {
      return PipeBlueprints[i].name;
    }
  }

  return '';
}

export function getPipe(str: string | string[], pipe: string): string | number {
  for (let l = 0; l < PipeBlueprints.length; l++) {
    if (pipe === PipeBlueprints[l].name) {
      return PipeBlueprints[l].get(str);
    }
  }

  return -1;
}

function mostFrequent(array: string[], return_number: boolean): string | number {
  if (array.length == 0) {
    return 'no statuses';
  }

  const modeMap: { [key: string]: number } = {};
  let maxEl: string = array[0];
  let maxCount = 1;

  for (let i = 0; i < array.length; i++) {
    const el = array[i];

    if (modeMap[el] == null) {
      modeMap[el] = 1;
    } else {
      modeMap[el]++;
    }

    if (modeMap[el] > maxCount) {
      maxEl = el;
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      maxCount = modeMap[el];
    }
  }

  return return_number ? maxCount : maxEl;
}

function isAcronym(candidate: string): boolean {
  const word_exp = new RegExp('\\b[A-Z]*[a-z]*[A-Z]s?\\d*[A-Z]*[\\-\\w+]\\b');
  return word_exp.test(candidate);
}

function getVowels(str: string): string[] {
  const new_str = str.toLowerCase().match(/[aeiouy]/gi);
  return new_str ? new_str : [];
}

function getConstants(str: string): string[] {
  const new_str = str.toLowerCase().match(/[bcdfghjklmnpqrstvwxz]/gi);
  return new_str ? new_str : [];
}
