export const colors = {
  bg: '#07090f',
  s1: '#0e1118',
  s2: '#141824',
  s3: '#1c2235',
  border: '#232a3d',
  borderLight: '#2d3652',
  primary: '#00b894',
  primary2: '#00d2a0',
  green: '#00d084',
  red: '#ff4444',
  blue: '#4d9fff',
  yellow: '#ffd60a',
  orange: '#ff8c38',
  text: '#dce4f5',
  textMuted: '#5a6a8a',
  textDim: '#2e3a52',
};

export const priorityColors = {
  high: colors.red,
  normal: colors.blue,
  low: colors.textMuted,
};

export const priorityLabels = {
  high: 'Υψηλή',
  normal: 'Κανονική',
  low: 'Χαμηλή',
};

export const statusColors = {
  open: colors.blue,
  claimed: colors.orange,
  in_progress: colors.yellow,
  completed: colors.green,
};

export const statusLabels = {
  open: 'Ανοιχτή',
  claimed: 'Ανατέθηκε',
  in_progress: 'Σε εξέλιξη',
  completed: 'Ολοκληρωμένη',
};
