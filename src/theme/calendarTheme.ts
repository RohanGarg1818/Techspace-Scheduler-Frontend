import { ClubId, ThemeMode } from '../types/calendar';

export interface ThemePalette {
  canvasBackground: string;
  surfaceBackground: string;
  surfaceElevated: string;
  surfaceSubtle: string;
  border: string;
  gridLine: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  textOutOfMonth: string;
  brandIconBg: string;
  brandSubtitle: string;
  navActiveBg: string;
  navActiveText: string;
  accentBg: string;
  accentHoverBg: string;
  accentText: string;
  accentSoftBg: string;
  accentSoftBorder: string;
  weekColumnHighlight: string;
  monthCellHighlight: string;
  segmentedTrackBg: string;
  buttonMutedBg: string;
  buttonMutedHoverBg: string;
  cardShadow: string;
  mandatoryBadgeBg: string;
  mandatoryBadgeText: string;
  optionalBadgeBg: string;
  optionalBadgeText: string;
}

export interface ClubThemeTokens {
  dot: string;
  miniRing: string;
  pillBg: string;
  pillBorder: string;
  pillText: string;
  weekBg: string;
  weekBar: string;
  weekText: string;
  kickerText: string;
  filterRowActiveBg: string;
  filterRowActiveBorder: string;
}

export const THEME_TOKENS: Record<ThemeMode, ThemePalette> = {
  light: {
    canvasBackground:
      'linear-gradient(135deg, #F6F2EC 0%, #EFE9E0 52%, #E7DFD5 100%)',
    surfaceBackground: 'linear-gradient(180deg, #FFFFFF 0%, #FCF9F6 100%)',
    surfaceElevated: '#FDFBF8',
    surfaceSubtle: '#F5F0EA',
    border: '#E7E0D7',
    gridLine: '#EDE6DE',
    textPrimary: '#1E1B18',
    textSecondary: '#585049',
    textMuted: '#8B8178',
    textOutOfMonth: '#C3BAB1',
    brandIconBg: '#F04D4D',
    brandSubtitle: '#DE4A4A',
    navActiveBg: '#EFEAE3',
    navActiveText: '#1E1B18',
    accentBg: '#F04D4D',
    accentHoverBg: '#DF3D3D',
    accentText: '#FFFFFF',
    accentSoftBg: 'linear-gradient(90deg, rgba(240, 77, 77, 0.13) 0%, rgba(240, 77, 77, 0.04) 100%)',
    accentSoftBorder: '#F3C5C5',
    weekColumnHighlight:
      'linear-gradient(180deg, rgba(240, 77, 77, 0.065) 0%, rgba(240, 77, 77, 0.025) 100%)',
    monthCellHighlight: '#FDF2F2',
    segmentedTrackBg: '#EDE7DF',
    buttonMutedBg: '#EFEAE3',
    buttonMutedHoverBg: '#E6DFD6',
    cardShadow:
      '0 8px 28px -8px rgba(56, 42, 28, 0.07), 0 1px 3px rgba(56, 42, 28, 0.03)',
    mandatoryBadgeBg: '#FCE8E8',
    mandatoryBadgeText: '#C63D3D',
    optionalBadgeBg: '#EBF1FA',
    optionalBadgeText: '#486C9E',
  },
  dark: {
    canvasBackground: '#101012',
    surfaceBackground: '#19191C',
    surfaceElevated: '#222226',
    surfaceSubtle: '#1C1C20',
    border: '#303035',
    gridLine: '#2A2A30',
    textPrimary: '#F2F2F3',
    textSecondary: '#B8B8C0',
    textMuted: '#96969F',
    textOutOfMonth: '#5A5A63',
    brandIconBg: '#29292E',
    brandSubtitle: '#DE4A4A',
    navActiveBg: '#29292E',
    navActiveText: '#F2F2F3',
    accentBg: '#F04D4D',
    accentHoverBg: '#DF3D3D',
    accentText: '#FFFFFF',
    accentSoftBg: '#25252A',
    accentSoftBorder: '#3C3C44',
    weekColumnHighlight: 'rgba(255, 255, 255, 0.035)',
    monthCellHighlight: '#242429',
    segmentedTrackBg: '#141416',
    buttonMutedBg: '#29292E',
    buttonMutedHoverBg: '#323238',
    cardShadow: 'none',
    mandatoryBadgeBg: '#2D2126',
    mandatoryBadgeText: '#E2A3B7',
    optionalBadgeBg: '#25252B',
    optionalBadgeText: '#96969F',
  },
};

const RAW_CLUB_THEME_TOKENS: Record<ThemeMode, Record<ClubId, ClubThemeTokens>> = {
  light: {
    'core-team': {
      dot: '#2D8A76',
      miniRing: '#5AB29F',
      pillBg: '#CDE7DD',
      pillBorder: '#A3D2C1',
      pillText: '#1A5647',
      weekBg: '#CBE6DB',
      weekBar: '#2B8571',
      weekText: '#174A3D',
      kickerText: '#277A69',
      filterRowActiveBg:
        'linear-gradient(90deg, rgba(45, 138, 118, 0.13) 0%, rgba(45, 138, 118, 0.04) 100%)',
      filterRowActiveBorder: '#9FD0C3',
    },
    'web-dev': {
      dot: '#9A6931',
      miniRing: '#C2945B',
      pillBg: '#EED9C4',
      pillBorder: '#DFBEA0',
      pillText: '#69431A',
      weekBg: '#EED7C2',
      weekBar: '#A87438',
      weekText: '#5C3A16',
      kickerText: '#8A5C26',
      filterRowActiveBg:
        'linear-gradient(90deg, rgba(154, 105, 49, 0.13) 0%, rgba(154, 105, 49, 0.04) 100%)',
      filterRowActiveBorder: '#DFBE9D',
    },
    design: {
      dot: '#884E7D',
      miniRing: '#B581AB',
      pillBg: '#E9DBF0',
      pillBorder: '#D4BBE0',
      pillText: '#5A2C54',
      weekBg: '#E7D8EE',
      weekBar: '#884E7D',
      weekText: '#4F254A',
      kickerText: '#78406E',
      filterRowActiveBg:
        'linear-gradient(90deg, rgba(136, 78, 125, 0.13) 0%, rgba(136, 78, 125, 0.04) 100%)',
      filterRowActiveBorder: '#D2B5CD',
    },
    operations: {
      dot: '#4C76A8',
      miniRing: '#79A0CC',
      pillBg: '#D3E1F5',
      pillBorder: '#B0C8EA',
      pillText: '#264974',
      weekBg: '#D1E0F4',
      weekBar: '#4C76A8',
      weekText: '#224269',
      kickerText: '#3E6593',
      filterRowActiveBg:
        'linear-gradient(90deg, rgba(76, 118, 168, 0.13) 0%, rgba(76, 118, 168, 0.04) 100%)',
      filterRowActiveBorder: '#ADC6E5',
    },
    announcements: {
      dot: '#B83B5E',
      miniRing: '#D46A87',
      pillBg: '#F5D5DF',
      pillBorder: '#E3AFC0',
      pillText: '#781E39',
      weekBg: '#F4D3DD',
      weekBar: '#B83B5E',
      weekText: '#6A1931',
      kickerText: '#A12F50',
      filterRowActiveBg:
        'linear-gradient(90deg, rgba(184, 59, 94, 0.13) 0%, rgba(184, 59, 94, 0.04) 100%)',
      filterRowActiveBorder: '#DF9EB1',
    },
  },
  dark: {
    'core-team': {
      dot: '#2EA374',
      miniRing: '#2EA374',
      pillBg: '#162D23',
      pillBorder: '#234738',
      pillText: '#BCE6D2',
      weekBg: '#162D23',
      weekBar: '#2EA374',
      weekText: '#D5EFE2',
      kickerText: '#5CC497',
      filterRowActiveBg: '#232826',
      filterRowActiveBorder: '#35483F',
    },
    'web-dev': {
      dot: '#C6863A',
      miniRing: '#C6863A',
      pillBg: '#2C2014',
      pillBorder: '#473421',
      pillText: '#E8CBA8',
      weekBg: '#2C2014',
      weekBar: '#C6863A',
      weekText: '#F2DEC6',
      kickerText: '#D8A25E',
      filterRowActiveBg: '#272421',
      filterRowActiveBorder: '#473B2E',
    },
    design: {
      dot: '#B4538C',
      miniRing: '#B4538C',
      pillBg: '#2C1925',
      pillBorder: '#492B3E',
      pillText: '#E9BDD7',
      weekBg: '#2C1925',
      weekBar: '#B4538C',
      weekText: '#F3D6E7',
      kickerText: '#D17AAE',
      filterRowActiveBg: '#282126',
      filterRowActiveBorder: '#483442',
    },
    operations: {
      dot: '#4E7FC2',
      miniRing: '#4E7FC2',
      pillBg: '#182536',
      pillBorder: '#2A3F5B',
      pillText: '#BFD4F0',
      weekBg: '#182536',
      weekBar: '#4E7FC2',
      weekText: '#DAE6F7',
      kickerText: '#76A1DE',
      filterRowActiveBg: '#222428',
      filterRowActiveBorder: '#363E4A',
    },
    announcements: {
      dot: '#D45D7E',
      miniRing: '#D45D7E',
      pillBg: '#301822',
      pillBorder: '#512939',
      pillText: '#F0B9C8',
      weekBg: '#301822',
      weekBar: '#D45D7E',
      weekText: '#F7D1DC',
      kickerText: '#E27C98',
      filterRowActiveBg: '#2A1F24',
      filterRowActiveBorder: '#523240',
    },
  },
};

function createSafeClubTokens(theme: ThemeMode) {
  const tokens = RAW_CLUB_THEME_TOKENS[theme];
  return new Proxy(tokens, {
    get(target, prop: string | symbol) {
      if (typeof prop === 'string' && prop in target) {
        return target[prop as ClubId];
      }
      return target['core-team'];
    },
  });
}

export const CLUB_THEME_TOKENS: Record<ThemeMode, Record<ClubId, ClubThemeTokens>> = {
  light: createSafeClubTokens('light'),
  dark: createSafeClubTokens('dark'),
};
