export interface SteamGame {
    type?: string;
    name?: string;
    steam_appid?: number;
    required_age?: number;
    is_free?: boolean;
    detailed_description?: string;
    about_the_game?: string;
    short_description?: string;
    supported_languages?: string;
    reviews?: string;
    header_image?: string;
    capsule_image?: string;
    capsule_imagev5?: string;
    website?: string;
    pc_requirements?: {
        minimum?: string;
        recommended?: string;
    };
    mac_requirements?: {
        minimum?: string;
        recommended?: string;
    };
    linux_requirements?: {
        minimum?: string;
        recommended?: string;
    };
    legal_notice?: string;
    developers?: string[];
    publishers?: string[];
    price_overview?: {
        currency?: string;
        initial?: number;
        final?: number;
        discount_percent?: number;
        initial_formatted?: string;
        final_formatted?: string;
    };
    packages?: number[];
    package_groups?: PackageGroup[];
    platforms?: {
        windows?: boolean;
        mac?: boolean;
        linux?: boolean;
    };
    categories?: Category[];
    genres?: Genre[];
    screenshots?: Screenshot[];
    movies?: Movie[];
    recommendations?: {
        total?: number;
    };
    release_date?: {
        coming_soon?: boolean;
        date?: string;
    };
    support_info?: {
        url?: string;
        email?: string;
    };
    background?: string;
    background_raw?: string;
    content_descriptors?: {
        ids?: number[];
        notes?: string | null;
    };
}

interface PackageGroup {
    name?: string;
    title?: string;
    description?: string;
    selection_text?: string;
    save_text?: string;
    display_type?: number;
    is_recurring_subscription?: string;
    subs?: Subscription[];
}

interface Subscription {
    packageid?: number;
    percent_savings_text?: string;
    percent_savings?: number;
    option_text?: string;
    option_description?: string;
    can_get_free_license?: string;
    is_free_license?: boolean;
    price_in_cents_with_discount?: number;
}

interface Category {
    id?: number;
    description?: string;
}

interface Genre {
    id?: string;
    description?: string;
}

interface Screenshot {
    id?: number;
    path_thumbnail?: string;
    path_full?: string;
}

interface Movie {
    id?: number;
    name?: string;
    thumbnail?: string;
    webm?: {
        '480'?: string;
        max?: string;
    };
    mp4?: {
        '480'?: string;
        max?: string;
    };
    highlight?: boolean;
}
