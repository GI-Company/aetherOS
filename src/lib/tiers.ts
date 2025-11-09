export type Tier = {
    id: 'free' | 'personal' | 'business' | 'enterprise' | 'free-trial';
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
        'Limited daily AI interactions',
        'Community support',
        'Data persistence',
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
      cta: 'Upgrade to Personal',
    },
    {
      id: 'business',
      name: 'Business',
      price: '$45',
      priceDescription: 'per user / month',
      features: [
        'All features from Personal',
        'Advanced AI models',
        'Team collaboration features',
        'Priority email support',
      ],
      cta: 'Upgrade to Business',
    },
      {
      id: 'enterprise',
      name: 'Enterprise',
      price: 'Contact Us',
      priceDescription: 'for custom pricing',
      features: [
        'All features from Business',
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
      ],
      cta: 'Your Current Plan',
    },
];
    