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
                src: '/logos/logo_main_user_transparent.png',
                sizes: 'any',
                type: 'image/png',
            },
        ],
    }
}
