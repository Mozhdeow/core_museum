import {SECTION_IDS, type MuseumItem, type MuseumSectionData} from '@/types/museum'

const sectionTitles = [
    ['Entrance', 'ÙˆØ±ÙˆØ¯ÛŒ'], ['CPU', 'Ù¾Ø±Ø¯Ø§Ø²Ù†Ø¯Ù‡'], ['GPU', 'Ù¾Ø±Ø¯Ø§Ø²Ù†Ø¯Ù‡ Ú¯Ø±Ø§ÙÛŒÚ©ÛŒ'],
    ['Memory', 'Ø­Ø§ÙØ¸Ù‡'], ['Storage', 'Ø°Ø®ÛŒØ±Ù‡â€ŒØ³Ø§Ø²ÛŒ'], ['Motherboard', 'Ù…Ø§Ø¯Ø±Ø¨Ø±Ø¯'],
    ['Future', 'Ø¢ÛŒÙ†Ø¯Ù‡'], ['Ending', 'Ù¾Ø§ÛŒØ§Ù†'],
]
export const mockSections: MuseumSectionData[] = SECTION_IDS.map((id, index) => ({
    id, title: {en: sectionTitles[index][0], fa: sectionTitles[index][1]}, sortOrder: index,
    available: index < 3,
}))
export const mockItems: MuseumItem[] = [{
    id: 'rtx-5090', title: {en: 'GeForce RTX 5090', fa: 'GeForce RTX 5090'},
    slug: 'nvidia-geforce-rtx-5090', brand: 'NVIDIA', category: 'gpu', releaseYear: 2025,
    shortDescription: {en: 'A new dimension of visual computing.', fa: 'Ø¨ÙØ¹Ø¯ÛŒ ØªØ§Ø²Ù‡ Ø¯Ø± Ù¾Ø±Ø¯Ø§Ø²Ø´ ØªØµÙˆÛŒØ±.'},
    description: {
        en: 'Billions of tiny switches. An extraordinary new perspective. Explore how parallel processing transforms data into the worlds we see, create, and imagine.',
        fa: 'Ù…ÛŒÙ„ÛŒØ§Ø±Ø¯Ù‡Ø§ Ú©Ù„ÛŒØ¯ Ú©ÙˆÚ†Ú©ØŒ Ù†Ú¯Ø§Ù‡ÛŒ ØªØ§Ø²Ù‡ Ø¨Ù‡ Ø¬Ù‡Ø§Ù†. Ú©Ø´Ù Ú©Ù†ÛŒØ¯ Ú©Ù‡ Ù¾Ø±Ø¯Ø§Ø²Ø´ Ù…ÙˆØ§Ø²ÛŒ Ú†Ú¯ÙˆÙ†Ù‡ Ø¯Ø§Ø¯Ù‡â€ŒÙ‡Ø§ Ø±Ø§ Ø¨Ù‡ Ø¯Ù†ÛŒØ§Ù‡Ø§ÛŒÛŒ ØªØ¨Ø¯ÛŒÙ„ Ù…ÛŒâ€ŒÚ©Ù†Ø¯ Ú©Ù‡ Ù…ÛŒâ€ŒØ¨ÛŒÙ†ÛŒÙ…ØŒ Ù…ÛŒâ€ŒØ³Ø§Ø²ÛŒÙ… Ùˆ ØªØµÙˆØ± Ù…ÛŒâ€ŒÚ©Ù†ÛŒÙ….',
    },
    specifications: [
        {label: {en: 'Architecture', fa: 'Ù…Ø¹Ù…Ø§Ø±ÛŒ'}, value: 'Blackwell'},
        {label: {en: 'Memory', fa: 'Ø­Ø§ÙØ¸Ù‡'}, value: '32 GB GDDR7'},
        {label: {en: 'Interface', fa: 'Ø±Ø§Ø¨Ø·'}, value: 'PCIe 5.0'},
    ],
    thumbnail: '/images/landing/studies/gpu-study.svg', model3DUrl: null, museumSection: 'gpu', sortOrder: 1,
    featured: true, status: 'published',
    galleryImages: [
        {
            id: 'study-01',
            url: '/images/landing/studies/gpu-study.svg',
            caption: {en: '01 â€” Form study / abstract GPU placeholder', fa: '01 â€” Ù…Ø·Ø§Ù„Ø¹Ù‡ ÙØ±Ù… / Ø·Ø±Ø­ Ø§Ù†ØªØ²Ø§Ø¹ÛŒ Ú©Ø§Ø±Øª Ú¯Ø±Ø§ÙÛŒÚ©'}
        },
        {
            id: 'study-02',
            url: '/images/landing/studies/core-study.svg',
            caption: {
                en: '02 â€” Silicon study / abstract processor placeholder',
                fa: '02 â€” Ù…Ø·Ø§Ù„Ø¹Ù‡ Ø³ÛŒÙ„ÛŒÚ©ÙˆÙ† / Ø·Ø±Ø­ Ø§Ù†ØªØ²Ø§Ø¹ÛŒ Ù¾Ø±Ø¯Ø§Ø²Ù†Ø¯Ù‡'
            }
        },
        {
            id: 'study-03',
            url: '/images/landing/studies/board-study.svg',
            caption: {en: '03 â€” Circuit study / abstract board placeholder', fa: '03 â€” Ù…Ø·Ø§Ù„Ø¹Ù‡ Ù…Ø¯Ø§Ø± / Ø·Ø±Ø­ Ø§Ù†ØªØ²Ø§Ø¹ÛŒ Ø¨Ø±Ø¯'}
        },
    ],
}]

