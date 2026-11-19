export interface WhatsAppSendParams {
    target: string; // Phone number (e.g., "919876543210") or Group ID (e.g., "120363023456789012@g.us")
    filename: string;
    fileBuffer: Buffer;
    caption?: string;
}

export interface WhatsAppSendResult {
    success: boolean;
    provider: 'ultramsg' | 'evolution' | 'none';
    messageId?: string;
    error?: string;
    rawResponse?: any;
}

export function getWhatsAppConfig() {
    const ultraInstance = process.env.ULTRAMSG_INSTANCE_ID?.trim();
    const ultraToken = process.env.ULTRAMSG_TOKEN?.trim();

    const evoUrl = process.env.EVOLUTION_API_URL?.trim();
    const evoKey = process.env.EVOLUTION_API_KEY?.trim();
    const evoInstance = process.env.EVOLUTION_INSTANCE_NAME?.trim() || 'default';

    const defaultTarget = process.env.WHATSAPP_DEFAULT_TARGET?.trim() || process.env.WHATSAPP_DEFAULT_GROUP_ID?.trim() || '';

    if (ultraInstance && ultraToken) {
        return {
            configured: true,
            provider: 'ultramsg' as const,
            ultraInstance,
            ultraToken,
            defaultTarget
        };
    }

    if (evoUrl && evoKey) {
        return {
            configured: true,
            provider: 'evolution' as const,
            evoUrl,
            evoKey,
            evoInstance,
            defaultTarget
        };
    }

    return {
        configured: false,
        provider: 'none' as const,
        defaultTarget
    };
}

/**
 * Format target phone or group ID into valid WhatsApp format:
 * - If contains '@g.us', it's already a group JID.
 * - If plain numbers, strip non-digits and ensure country code (default 91 for India if 10 digits).
 */
export function formatWhatsAppTarget(target: string): string {
    const trimmed = (target || '').trim();
    if (trimmed.includes('@g.us') || trimmed.includes('@s.whatsapp.net')) {
        return trimmed;
    }
    const digits = trimmed.replace(/\D/g, '');
    if (digits.length === 10) {
        return `91${digits}`;
    }
    return digits;
}

/**
 * Send PDF Document to WhatsApp via UltraMsg or Evolution API
 */
export async function sendWhatsAppDocument(params: WhatsAppSendParams): Promise<WhatsAppSendResult> {
    const config = getWhatsAppConfig();

    if (!config.configured) {
        return {
            success: false,
            provider: 'none',
            error: 'WhatsApp API credentials are not configured. Please set ULTRAMSG_INSTANCE_ID & ULTRAMSG_TOKEN, or EVOLUTION_API_URL & EVOLUTION_API_KEY in .env.local.'
        };
    }

    const targetFormatted = formatWhatsAppTarget(params.target);
    if (!targetFormatted) {
        return {
            success: false,
            provider: config.provider,
            error: 'A valid WhatsApp phone number or Group ID is required.'
        };
    }

    const base64Data = params.fileBuffer.toString('base64');

    // 1. UltraMsg Provider
    if (config.provider === 'ultramsg') {
        try {
            const dataUri = `data:application/pdf;base64,${base64Data}`;
            const endpoint = `https://api.ultramsg.com/${config.ultraInstance}/messages/document`;

            const res = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: new URLSearchParams({
                    token: config.ultraToken!,
                    to: targetFormatted,
                    filename: params.filename,
                    document: dataUri,
                    caption: params.caption || '',
                }).toString(),
            });

            const data = await res.json();
            if (data.sent === 'true' || data.id || data.status === 'success') {
                return {
                    success: true,
                    provider: 'ultramsg',
                    messageId: data.id || (typeof data.message === 'string' ? data.message : undefined),
                    rawResponse: data,
                };
            }

            return {
                success: false,
                provider: 'ultramsg',
                error: data.error || data.message || 'UltraMsg failed to deliver document.',
                rawResponse: data,
            };
        } catch (err: any) {
            return {
                success: false,
                provider: 'ultramsg',
                error: err.message || 'Network error connecting to UltraMsg.',
            };
        }
    }

    // 2. Evolution API Provider
    if (config.provider === 'evolution') {
        try {
            const cleanUrl = config.evoUrl!.replace(/\/+$/, '');
            const endpoint = `${cleanUrl}/message/sendMedia/${config.evoInstance}`;

            const res = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'apikey': config.evoKey!,
                },
                body: JSON.stringify({
                    number: targetFormatted,
                    mediaMessage: {
                        mediatype: 'document',
                        media: base64Data,
                        fileName: params.filename,
                        caption: params.caption || '',
                    },
                }),
            });

            const data = await res.json();
            if (res.ok && (data.key?.id || data.messageId || data.status === 'SUCCESS' || data.sent)) {
                return {
                    success: true,
                    provider: 'evolution',
                    messageId: data.key?.id || data.messageId,
                    rawResponse: data,
                };
            }

            return {
                success: false,
                provider: 'evolution',
                error: data.message || data.error || 'Evolution API failed to deliver document.',
                rawResponse: data,
            };
        } catch (err: any) {
            return {
                success: false,
                provider: 'evolution',
                error: err.message || 'Network error connecting to Evolution API.',
            };
        }
    }

    return {
        success: false,
        provider: 'none',
        error: 'Unknown WhatsApp provider configuration.',
    };
}
