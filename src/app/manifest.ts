import { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
    return {
        name: 'CPack Manufacturing',
        short_name: 'CPack',
        description: 'CPack Manufacturing & Order Management System',
        start_url: '/',
        display: 'standalone',
        background_color: '#ffffff',
        theme_color: '#4f46e5',
        icons: [
            {
                src: '/creative_logo.png',
                sizes: 'any',
                type: 'image/png',
            },
        ],
    }
}
