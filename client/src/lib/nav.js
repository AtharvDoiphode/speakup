import {
  HouseIcon,
  ChatsCircleIcon,
  PencilSimpleLineIcon,
  MicrophoneIcon,
  TextAaIcon,
  BookOpenIcon,
  ChartLineUpIcon,
  ClockCounterClockwiseIcon,
  GearSixIcon,
} from '@phosphor-icons/react';

// Every page in the app shell. The sidebar shows all of them.
// "primary: true" marks the ones that also get a tab on phones;
// the rest sit behind the "More" tab.
export const NAV = [
  { to: '/', label: 'Home', icon: HouseIcon, primary: true },
  { to: '/practice', label: 'Practice', icon: ChatsCircleIcon, primary: true },
  { to: '/writing', label: 'Writing', icon: PencilSimpleLineIcon, primary: true },
  { to: '/read-aloud', label: 'Read Aloud', icon: MicrophoneIcon },
  { to: '/grammar', label: 'Grammar', icon: TextAaIcon },
  { to: '/vocabulary', label: 'Vocabulary', icon: BookOpenIcon },
  { to: '/progress', label: 'Progress', icon: ChartLineUpIcon, primary: true },
  { to: '/history', label: 'History', icon: ClockCounterClockwiseIcon },
  { to: '/settings', label: 'Settings', icon: GearSixIcon },
];

export const PRIMARY_NAV = NAV.filter((item) => item.primary);
export const MORE_NAV = NAV.filter((item) => !item.primary);
