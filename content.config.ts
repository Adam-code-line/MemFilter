import { defineContentConfig, defineCollection, z } from '@nuxt/content'

const variantEnum = z.enum(['solid', 'outline', 'subtle', 'soft', 'ghost', 'link'])
const colorEnum = z.enum(['primary', 'secondary', 'neutral', 'error', 'warning', 'success', 'info'])
const sizeEnum = z.enum(['xs', 'sm', 'md', 'lg', 'xl'])
const orientationEnum = z.enum(['vertical', 'horizontal'])

const createLinkSchema = () =>
  z.object({
    label: z.string().nonempty(),
    to: z.string().optional(),
    action: z.string().optional(),
    icon: z.string().optional(),
    target: z.string().optional(),
  })

const createFeatureSchema = () =>
  z.object({
    title: z.string().nonempty(),
    description: z.string().optional(),
    icon: z.string().optional(),
  })

export default defineContentConfig({
  collections: {
    index: defineCollection({
      source: 'index.yml',
      type: 'page',
      schema: z.object({
        title: z.string().nonempty(),
        description: z.string().optional(),
        hero: z
          .object({
            subtitle: z.string().optional(),
            links: z.array(createLinkSchema()).optional(),
          })
          .optional(),
        sections: z
          .array(
            z.object({
              id: z.string().optional(),
              title: z.string().nonempty(),
              description: z.string().optional(),
              body: z.string().optional(),
              orientation: orientationEnum.optional(),
              reverse: z.boolean().optional(),
              features: z.array(createFeatureSchema()).optional(),
            })
          )
          .optional(),
        features: z
          .object({
            title: z.string().nonempty(),
            description: z.string().optional(),
            items: z.array(createFeatureSchema()).optional(),
          })
          .optional(),
        testimonials: z
          .object({
            title: z.string().optional(),
            description: z.string().optional(),
            items: z
              .array(
                z.object({
                  quote: z.string().nonempty(),
                  user: z.object({
                    name: z.string().nonempty(),
                    description: z.string().optional(),
                    to: z.string().optional(),
                    target: z.string().optional(),
                    avatar: z
                      .object({
                        src: z.string().nonempty(),
                        alt: z.string().optional(),
                      })
                      .optional(),
                  }),
                })
              )
              .optional(),
          })
          .optional(),
        cta: z
          .object({
            title: z.string().nonempty(),
            description: z.string().optional(),
            action: z.string().optional(),
            links: z.array(createLinkSchema()).optional(),
          })
          .optional(),
      }),
    }),

    login: defineCollection({
      source: 'login.yml',
      type: 'page',
      schema: z.object({
        title: z.string().optional(),
        description: z.string().optional(),
        hero: z
          .object({
            title: z.string().optional(),
            subtitle: z.string().optional(),
          })
          .optional(),
        forms: z
          .object({
            login: z
              .object({
                title: z.string().optional(),
                subtitle: z.string().optional(),
                fields: z.record(
                  z.object({
                    label: z.string().optional(),
                    placeholder: z.string().optional(),
                  })
                ).optional(),
                submit: z.string().optional(),
                switchText: z.string().optional(),
                switchAction: z.string().optional(),
              })
              .optional(),
            signup: z
              .object({
                title: z.string().optional(),
                subtitle: z.string().optional(),
                fields: z.record(
                  z.object({
                    label: z.string().optional(),
                    placeholder: z.string().optional(),
                  })
                ).optional(),
                submit: z.string().optional(),
                switchText: z.string().optional(),
                switchAction: z.string().optional(),
              })
              .optional(),
          })
          .optional(),
        errors: z.record(z.string()).optional(),
        labels: z.record(z.string()).optional(),
      }),
    }),
  },
})
