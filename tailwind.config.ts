import type { Config } from 'tailwindcss'
import typography from '@tailwindcss/typography'

export default <Partial<Config>>{
  theme: {
    extend: {
      typography: {
        invert: {
          css: {
            a: {
              color: 'rgb(56 189 248)',
              '&:hover': {
                color: 'rgb(125 211 252)',
              },
            },
            code: {
              color: 'rgb(226 232 240)',
            },
            strong: {
              color: 'rgb(248 250 252)',
            },
          },
        },
      },
    },
  },
  plugins: [typography],
}
