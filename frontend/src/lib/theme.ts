// The app's look, in one place: Nihal's design pattern from the admin pages and the sign-in
// page. Use these instead of writing colours by hand, so every page matches. When the team's
// design document arrives, change the values here and every page follows.
//
// Every class sets its text colour on purpose: globals.css switches text to near-white when
// the computer is in dark mode, but the app is designed for a white background, so any text
// without its own colour fades out.
//
// Font: Arial (set on <body> in globals.css), the same everywhere. Don't add font classes.

export const COLORS = {
  primary: '#4361AB', // headers, buttons, links, icons
  primaryHover: '#36509A',
  text: '#222222', // all body text and headings
  panel: '#E8F1F8', // light blue boxes (assistant answers, help boxes)
  sidebar: '#DDE8F2', // sidebars and the chat input
  note: '#F4F7FB', // pale info boxes
} as const

export const ui = {
  // Page structure (inside the app's sidebar layout)
  page: 'p-6 text-[#222222]',
  pageTitle: 'text-3xl font-bold text-[#222222]',
  pageDescription: 'mt-1 text-sm text-[#222222]',
  sectionTitle: 'text-sm font-bold text-[#222222]',

  // Pages outside the app layout (sign-in, sign-up, landing, not found): blue bar on top
  topBar: 'w-full bg-[#4361AB] px-4 py-3 sm:px-6 md:px-8',
  topBarTitle: 'text-lg font-bold text-white sm:text-xl md:text-2xl',

  // Boxes
  card: 'rounded-lg border border-gray-300 bg-white p-4 text-[#222222]',
  helpBox: 'rounded border border-[#4361AB] bg-[#E8F1F8] px-4 py-3 text-sm text-[#222222]',
  emptyBox: 'rounded-lg border border-gray-300 bg-gray-50 px-4 py-3 text-sm text-gray-600',

  // Forms
  label: 'text-sm font-semibold text-[#222222]',
  input:
    'mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-[#222222] placeholder:text-gray-400 outline-none focus:border-[#4361AB] aria-invalid:border-red-500',
  fieldError: 'text-xs text-red-600',

  // Buttons and links
  buttonPrimary:
    'rounded bg-[#4361AB] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#36509A] disabled:cursor-not-allowed disabled:opacity-50',
  buttonSecondary:
    'rounded border border-[#4361AB] bg-white px-4 py-2 text-sm font-semibold text-[#4361AB] transition-colors hover:bg-[#E8F1F8] disabled:cursor-not-allowed disabled:opacity-50',
  link: 'font-semibold text-[#4361AB] hover:underline',

  // Text
  muted: 'text-sm text-gray-600',
} as const
