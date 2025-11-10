
'use client';

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tier } from '@/lib/tiers';
import { cn } from '@/lib/utils';
import { CheckCircle2, Loader2 } from 'lucide-react';


export const TierCard = ({ tier, isSelected, onSelect, currentTierId, isSelectable = true }: { tier: Tier, isSelected: boolean, onSelect: (id: Tier['id']) => void, currentTierId?: Tier['id'], isSelectable?: boolean }) => {
  const isCurrent = currentTierId === tier.id;
  const showSelect = isSelectable && !isCurrent && tier.id !== 'enterprise' && tier.id !== 'free-trial';

  const handleClick = () => {
    if (showSelect) {
      onSelect(tier.id);
    }
  }

  const getButtonVariant = () => {
    if (isCurrent || !showSelect) return 'outline';
    return isSelected ? 'default' : 'secondary';
  }
  
  const getButtonText = () => {
      if(isCurrent) return "Your Current Plan";
      if(tier.id === 'enterprise') return 'Contact Sales';
      if(tier.id === 'free-trial') return 'Guest Session';
      if(isSelected) return 'Proceed to Checkout';
      return tier.cta;
  }

  return (
    <Card
      className={cn(
        "transition-all flex flex-col",
        isCurrent ? "border-accent ring-2 ring-accent" : "hover:border-muted-foreground/50",
        isSelected && !isCurrent && "border-accent ring-2 ring-accent",
        !showSelect && "opacity-80",
        showSelect && "cursor-pointer"
      )}
      onClick={handleClick}
    >
      <CardHeader>
        <CardTitle>{tier.name}</CardTitle>
        <CardDescription className="flex items-baseline gap-1">
          <span className="text-2xl font-bold text-foreground">{tier.price}</span>
          <span className="text-sm">{tier.priceDescription}</span>
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-grow">
        <ul className="space-y-2 text-sm text-muted-foreground">
          {tier.features.slice(0, 3).map((feature) => (
            <li key={feature} className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 mt-0.5 text-green-500 flex-shrink-0" />
              <span>{feature}</span>
            </li>
          ))}
        </ul>
      </CardContent>
      <CardFooter className="flex-col items-stretch gap-2 !pt-4">
        <Button variant={getButtonVariant()} className="w-full" disabled={!showSelect || isSelected}>
            {isSelected && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {getButtonText()}
        </Button>
      </CardFooter>
    </Card>
  );
};
