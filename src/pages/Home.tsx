import { Link, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Calendar, Package, CheckCircle2, Bike, Camera, Shield, Wrench } from "lucide-react";
import heroCycle from "@/assets/hero-cycle.png";
import { Navbar } from "@/components/Navbar";

const Home = () => {
  const navigate = useNavigate();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const checkUserAndRedirect = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        navigate('/bookings');
      } else {
        setIsChecking(false);
      }
    };

    checkUserAndRedirect();
  }, [navigate]);

  if (isChecking) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mx-auto"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      {/* Hero Section - Mobile First */}
      <section className="relative min-h-[85vh] sm:min-h-[500px] md:h-[600px] flex items-center justify-center overflow-hidden">
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{ 
            backgroundImage: `url(${heroCycle})`,
            filter: 'brightness(0.6)'
          }}
        />
        <div className="absolute inset-0 bg-gradient-hero" />
        
        <div className="container mx-auto px-5 sm:px-6 py-8 relative z-10 text-center text-white animate-fade-in">
          <h1 className="text-2xl sm:text-3xl md:text-5xl lg:text-6xl font-bold mb-3 sm:mb-4 md:mb-6 leading-tight">
            Discover Kashi on Two Wheels
          </h1>
          <p className="text-base sm:text-lg md:text-xl mb-2 sm:mb-3 text-white/90">
            काशी की पवित्र गलियों का अन्वेषण करें
          </p>
          <p className="text-sm sm:text-base md:text-lg mb-6 sm:mb-8 text-white/80 max-w-xl mx-auto px-2">
            Experience the ancient lanes of Kashi at your own pace with our electric bicycles
          </p>
          <Button asChild size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground text-sm sm:text-base md:text-lg px-6 sm:px-8 py-5 sm:py-6 shadow-glow w-full sm:w-auto max-w-xs">
            <Link to="/book">Book Your Ride</Link>
          </Button>
        </div>
      </section>

      {/* How It Works - Mobile Optimized */}
      <section className="py-10 sm:py-12 md:py-16 bg-muted/30">
        <div className="container mx-auto px-4 sm:px-6">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-center mb-6 sm:mb-8 md:mb-12">How It Works</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 md:gap-6">
            {[
              { icon: Calendar, title: "Choose Date", description: "Select pickup date & duration" },
              { icon: Package, title: "Add Gear", description: "Enhance with accessories" },
              { icon: CheckCircle2, title: "Confirm", description: "Quick verification" },
              { icon: Bike, title: "Explore", description: "Start your journey" }
            ].map((step, index) => (
              <Card key={index} className="text-center hover:shadow-warm transition-all duration-300 bg-gradient-card border-primary/10">
                <CardContent className="p-3 sm:p-4 md:pt-6">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 md:w-16 md:h-16 mx-auto mb-2 sm:mb-3 md:mb-4 rounded-full bg-primary/10 flex items-center justify-center">
                    <step.icon className="w-5 h-5 sm:w-6 sm:h-6 md:w-8 md:h-8 text-primary" />
                  </div>
                  <h3 className="text-sm sm:text-base md:text-xl font-semibold mb-1 sm:mb-2">{step.title}</h3>
                  <p className="text-xs sm:text-sm text-muted-foreground leading-tight">{step.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Cards - Mobile Optimized */}
      <section className="py-10 sm:py-12 md:py-16">
        <div className="container mx-auto px-4 sm:px-6">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-center mb-2 sm:mb-3">Choose Your Duration</h2>
          <p className="text-center text-muted-foreground text-sm sm:text-base mb-6 sm:mb-8 md:mb-12">Flexible rental options for every explorer</p>
          
          <div className="grid grid-cols-1 gap-4 sm:gap-6 md:gap-8 max-w-5xl mx-auto">
            {/* Mobile: Horizontal scroll cards, Desktop: Grid */}
            <div className="flex md:grid md:grid-cols-3 gap-4 sm:gap-6 overflow-x-auto md:overflow-visible pb-4 md:pb-0 snap-x snap-mandatory md:snap-none -mx-4 px-4 md:mx-0 md:px-0">
              {[
                { 
                  duration: "One Day", 
                  price: "₹499", 
                  deposit: "₹2,000", 
                  features: ["24 hours rental", "Free helmet", "Basic support"],
                  popular: false
                },
                { 
                  duration: "One Week", 
                  price: "₹1,999", 
                  deposit: "₹2,000", 
                  features: ["168 hours rental", "Free helmet & lock", "Priority support"],
                  popular: true
                },
                { 
                  duration: "One Month", 
                  price: "₹4,999", 
                  deposit: "₹5,000", 
                  features: ["30 days rental", "All accessories 20% off", "Free servicing"],
                  popular: false
                }
              ].map((plan, index) => (
                <Card 
                  key={index} 
                  className={`relative flex-shrink-0 w-[280px] sm:w-[300px] md:w-auto snap-center hover:shadow-warm transition-all duration-300 ${
                    plan.popular ? 'border-primary shadow-warm md:scale-105' : 'border-primary/20'
                  }`}
                >
                  {plan.popular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-primary text-primary-foreground px-3 py-0.5 rounded-full text-xs sm:text-sm font-semibold whitespace-nowrap">
                      Most Popular
                    </div>
                  )}
                  <CardContent className="p-4 sm:p-6 md:pt-8 text-center">
                    <h3 className="text-xl sm:text-2xl font-bold mb-1 sm:mb-2">{plan.duration}</h3>
                    <div className="text-3xl sm:text-4xl font-bold text-primary mb-1 sm:mb-2">{plan.price}</div>
                    <p className="text-xs sm:text-sm text-muted-foreground mb-4 sm:mb-6">Deposit: {plan.deposit} (refundable)</p>
                    <ul className="space-y-2 sm:space-y-3 mb-4 sm:mb-6 text-left">
                      {plan.features.map((feature, i) => (
                        <li key={i} className="flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-primary flex-shrink-0" />
                          <span className="text-xs sm:text-sm">{feature}</span>
                        </li>
                      ))}
                    </ul>
                    <Button asChild className="w-full bg-gradient-primary hover:opacity-90 text-sm sm:text-base py-2 sm:py-2.5">
                      <Link to="/book">Select Plan</Link>
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Accessories Showcase - Mobile Optimized */}
      <section className="py-10 sm:py-12 md:py-16 bg-muted/30">
        <div className="container mx-auto px-4 sm:px-6">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-center mb-2 sm:mb-3">Enhance Your Journey</h2>
          <p className="text-center text-muted-foreground text-sm sm:text-base mb-6 sm:mb-8 md:mb-12">Optional accessories for a better ride</p>
          
          <div className="grid grid-cols-2 gap-3 sm:gap-4 md:gap-6 max-w-4xl mx-auto">
            {[
              { name: "Ray-Ban Glasses", price: "₹1,200/day", icon: Shield },
              { name: "GoPro Camera", price: "₹700/day", icon: Camera },
              { name: "Smart Helmet", price: "₹200/day", icon: Shield },
              { name: "Pump & Tools", price: "₹80/day", icon: Wrench }
            ].map((accessory, index) => (
              <Card key={index} className="hover:shadow-warm transition-all duration-300 border-primary/10">
                <CardContent className="p-3 sm:p-4 md:pt-6 text-center">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 md:w-16 md:h-16 mx-auto mb-2 sm:mb-3 md:mb-4 rounded-full bg-primary/10 flex items-center justify-center">
                    <accessory.icon className="w-5 h-5 sm:w-6 sm:h-6 md:w-8 md:h-8 text-primary" />
                  </div>
                  <h3 className="text-xs sm:text-sm md:text-base font-semibold mb-1 leading-tight">{accessory.name}</h3>
                  <p className="text-primary font-bold text-sm sm:text-base">{accessory.price}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Kashi Experience Section - Mobile Optimized */}
      <section className="py-10 sm:py-12 md:py-16">
        <div className="container mx-auto px-5 sm:px-6">
          <div className="max-w-2xl mx-auto text-center">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-3 sm:mb-4 md:mb-6">Navigate Ancient Kashi, Sustainably</h2>
            <p className="text-sm sm:text-base md:text-lg text-muted-foreground mb-5 sm:mb-6 md:mb-8 leading-relaxed">
              From the sacred ghats along the Ganga to the bustling lanes of ancient temples, 
              experience Varanasi's spiritual heritage on our eco-friendly electric bicycles.
            </p>
            <Button asChild size="lg" className="bg-gradient-primary hover:opacity-90 w-full sm:w-auto max-w-xs text-sm sm:text-base">
              <Link to="/book">Start Your Journey</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Footer - Mobile Optimized */}
      <footer className="bg-secondary text-secondary-foreground py-6 sm:py-8 mt-8 sm:mt-12 md:mt-16">
        <div className="container mx-auto px-4 text-center">
          <p className="text-sm sm:text-base mb-1 sm:mb-2">Bolt91 - By BlueBolt Electrical Pvt Ltd</p>
          <p className="text-xs sm:text-sm text-secondary-foreground/70 mt-2 sm:mt-4">
            © 2025 Bolt91. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Home;