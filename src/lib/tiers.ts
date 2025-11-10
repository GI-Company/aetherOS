
export type Tier = {
    id: 'free' | 'personal' | 'business' | 'business-plus' | 'enterprise' | 'free-trial';
    name: string;
    price: string;
    priceDescription: string;
    features: string[];
    cta: string;
}

export const TIERS: Tier[] = [
    {
      id: 'free',
      name: 'Free',
      price: '$0',
      priceDescription: 'Forever',
      features: [
        'Access to all applications',
        'Data persistence for your account',
        '50 AI interactions per day',
        'Community support',
      ],
      cta: 'Select Plan',
    },
    {
      id: 'personal',
      name: 'Personal',
      price: '$10',
      priceDescription: 'per month',
      features: [
        'Full data persistence',
        'Unlimited AI interactions',
        'Standard AI models',
        'Community support',
      ],
      cta: 'Upgrade',
    },
    {
      id: 'business',
      name: 'Business',
      price: '$45',
      priceDescription: 'per user / month',
      features: [
        'All features from Personal',
        'Advanced AI models (Gemini 1.5 Pro)',
        'Team collaboration features',
        'Priority email support',
      ],
      cta: 'Upgrade',
    },
     {
      id: 'business-plus',
      name: 'Business Plus',
      price: '$75',
      priceDescription: 'per user / month',
      features: [
        'All features from Business',
        'Cutting-edge AI models (Gemini 2.0)',
        'Increased API rate limits',
        'Early access to new features',
      ],
      cta: 'Upgrade',
    },
      {
      id: 'enterprise',
      name: 'Enterprise',
      price: 'Contact Us',
      priceDescription: 'for custom pricing',
      features: [
        'All features from Business Plus',
        'Dedicated infrastructure options',
        'On-premise deployment available',
        '24/7 dedicated support & SLAs',
      ],
      cta: 'Contact Sales',
    },
    {
      id: 'free-trial',
      name: 'Guest Trial',
      price: '$0',
      priceDescription: '15-minute session',
      features: [
        'Access to all applications',
        'Limited AI interactions',
        'No data persistence after session',
        'Your Current Plan'
      ],
      cta: 'Current Plan',
    },
];
    
