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

    home: defineCollection({
      source: 'home.yml',
      type: 'page',
      schema: z.object({
        title: z.string().optional(),
        description: z.string().optional(),
        welcome: z
          .object({
            title: z.string().optional(),
            subtitle: z.string().optional(),
          })
          .optional(),
        quickActions: z
          .object({
            title: z.string().optional(),
            items: z
              .array(
                z.object({
                  label: z.string(),
                  description: z.string().optional(),
                  icon: z.string().optional(),
                  to: z.string(),
                  color: z.string().optional(),
                })
              )
              .optional(),
          })
          .optional(),
        stats: z
          .object({
            title: z.string().optional(),
            items: z
              .array(
                z.object({
                  label: z.string(),
                  value: z.string(),
                  icon: z.string().optional(),
                })
              )
              .optional(),
          })
          .optional(),
        memoryOverview: z
          .object({
            title: z.string().optional(),
            viewDetails: z.string().optional(),
          })
          .optional(),
        aiStatus: z
          .object({
            title: z.string().optional(),
            status: z.string().optional(),
            description: z.string().optional(),
            lastUpdate: z.string().optional(),
          })
          .optional(),
        recentActivity: z
          .object({
            title: z.string().optional(),
            viewAll: z.string().optional(),
            empty: z
              .object({
                title: z.string().optional(),
                subtitle: z.string().optional(),
                action: z.string().optional(),
              })
              .optional(),
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
            icon: z.string().optional(),
            gradient: z.string().optional(),
          })
          .optional(),
        branding: z
          .object({
            name: z.string().optional(),
            tagline: z.string().optional(),
            logo: z.string().optional(),
          })
          .optional(),
        ui: z
          .object({
            background: z
              .object({
                gradient: z.string().optional(),
                overlay: z.string().optional(),
              })
              .optional(),
            card: z
              .object({
                background: z.string().optional(),
                border: z.string().optional(),
                shadow: z.string().optional(),
                rounded: z.string().optional(),
              })
              .optional(),
            colors: z
              .object({
                primary: z.string().optional(),
                secondary: z.string().optional(),
                accent: z.string().optional(),
              })
              .optional(),
          })
          .optional(),
        forms: z
          .object({
            login: z
              .object({
                title: z.string().optional(),
                subtitle: z.string().optional(),
                icon: z.string().optional(),
                fields: z.record(
                  z.object({
                    label: z.string().optional(),
                    placeholder: z.string().optional(),
                    icon: z.string().optional(),
                    type: z.string().optional(),
                  })
                ).optional(),
                submit: z.string().optional(),
                submitIcon: z.string().optional(),
                switchText: z.string().optional(),
                switchAction: z.string().optional(),
              })
              .optional(),
            signup: z
              .object({
                title: z.string().optional(),
                subtitle: z.string().optional(),
                icon: z.string().optional(),
                fields: z.record(
                  z.object({
                    label: z.string().optional(),
                    placeholder: z.string().optional(),
                    icon: z.string().optional(),
                    type: z.string().optional(),
                  })
                ).optional(),
                submit: z.string().optional(),
                submitIcon: z.string().optional(),
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

    note: defineCollection({
      source: 'note.yml',
      type: 'page',
      schema: z.object({
        title: z.string().optional(),
        subtitle: z.string().optional(),
        badge: z
          .object({
            label: z.string().optional(),
            color: colorEnum.optional(),
            icon: z.string().optional()
          })
          .optional(),
        actions: z
          .array(
            z.object({
              key: z.string().optional(),
              label: z.string().nonempty(),
              to: z.string().optional(),
              icon: z.string().optional(),
              variant: variantEnum.optional(),
              color: colorEnum.optional(),
              size: sizeEnum.optional()
            })
          )
          .optional(),
        filters: z
          .object({
            searchPlaceholder: z.string().optional(),
            summaryLabel: z.string().optional(),
            selectedLabel: z.string().optional(),
            viewToggle: z
              .object({
                card: z.string().optional(),
                list: z.string().optional()
              })
              .optional(),
            importance: z
              .array(
                z.object({
                  label: z.string().nonempty(),
                  value: z.string().nonempty(),
                  icon: z.string().optional()
                })
              )
              .optional()
          })
          .optional(),
        stats: z
          .object({
            items: z
              .array(
                z.object({
                  key: z.string().nonempty(),
                  title: z.string().nonempty(),
                  description: z.string().optional(),
                  icon: z.string().optional(),
                  variant: z.enum(['gradient', 'glass', 'minimal', 'elevated']).optional()
                })
              )
              .optional()
          })
          .optional(),
        emptyState: z
          .object({
            title: z.string().optional(),
            description: z.string().optional(),
            action: z
              .object({
                label: z.string().optional(),
                icon: z.string().optional(),
                to: z.string().optional(),
                variant: variantEnum.optional(),
                color: colorEnum.optional()
              })
              .optional()
          })
          .optional(),
        editor: z
          .object({
            titlePlaceholder: z.string().optional(),
            contentPlaceholders: z
              .object({
                default: z.string(),
                fading: z.string().optional(),
                strongFading: z.string().optional()
              })
              .optional(),
            actions: z
              .object({
                save: z.string().optional(),
                cancel: z.string().optional()
              })
              .optional(),
            status: z
              .object({
                saved: z.string().optional(),
                unsaved: z.string().optional()
              })
              .optional(),
            metaLabels: z
              .object({
                wordCount: z.string().optional(),
                readTime: z.string().optional(),
                lastEdited: z.string().optional()
              })
              .optional(),
            aiBadgePrefix: z.string().optional()
          })
          .optional()
      }),
    }),
  },
})
