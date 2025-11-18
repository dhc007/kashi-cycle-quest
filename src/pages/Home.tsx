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
        // User is logged in, check their booking history
        const { data: bookingsData } = await supabase
          .from('bookings')
          .select('id')
          .eq('user_id', session.user.id)
          .limit(1);

        if (bookingsData && bookingsData.length > 0) {
          // Has past bookings, go to bookings page
          navigate('/bookings');
        } else {
          // No past bookings, go to book page
          navigate('/book');
        }
      } else {
        // Not logged in, stay on home page
        setIsChecking(false);
      }
    };

    checkUserAndRedirect();
  }, [navigate]);

  if (isChecking) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      {/* Hero Section */}
      <section className="relative min-h-[500px] md:h-[600px] flex items-center justify-center overflow-hidden">
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{ 
            backgroundImage: `url(${heroCycle})`,
            filter: 'brightness(0.7)'
          }}
        />
        <div className="absolute inset-0 bg-gradient-hero" />
        
        <div className="container mx-auto px-4 py-12 md:py-0 relative z-10 text-center text-white animate-fade-in">
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-7xl font-bold mb-4 md:mb-6">
            Discover Kashi on Two Wheels
          </h1>
          <p className="text-lg sm:text-xl md:text-2xl mb-3 md:mb-4 text-white/90">
            काशी की पवित्र गलियों का अन्वेषण करें
          </p>
          <p className="text-base sm:text-lg md:text-xl mb-6 md:mb-8 text-white/80 max-w-2xl mx-auto px-4">
            Experience the ancient lanes of Kashi at your own pace with our electric bicycles
          </p>
          <Button asChild size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground text-base md:text-lg px-6 md:px-8 py-4 md:py-6 shadow-glow">
            <Link to="/book">Book Your Ride</Link>
          </Button>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-12 md:py-16 bg-muted/30">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-8 md:mb-12">How It Works</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
            {[
              { icon: Calendar, title: "Choose Date & Time", description: "Select your pickup date and rental duration" },
              { icon: Package, title: "Add Accessories", description: "Enhance your journey with optional gear" },
              { icon: CheckCircle2, title: "Complete Booking", description: "Quick verification and secure payment" },
              { icon: Bike, title: "Start Exploring", description: "Pick up your cycle and discover Kashi" }
            ].map((step, index) => (
              <Card key={index} className="text-center hover:shadow-warm transition-all duration-300 bg-gradient-card border-primary/10">
                <CardContent className="pt-6">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
                    <step.icon className="w-8 h-8 text-primary" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">{step.title}</h3>
                  <p className="text-muted-foreground">{step.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="py-12 md:py-16">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-3 md:mb-4">Choose Your Duration</h2>
          <p className="text-center text-muted-foreground mb-8 md:mb-12">Flexible rental options for every explorer</p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 max-w-5xl mx-auto">
            {[
              { 
                duration: "One Day", 
                price: "₹499", 
                deposit: "₹2,000", 
                features: ["24 hours rental", "Free helmet", "Basic support", "Flexible pickup"],
                popular: false
              },
              { 
                duration: "One Week", 
                price: "₹1,999", 
                deposit: "₹2,000", 
                features: ["168 hours rental", "Free helmet & lock", "Priority support", "Free maintenance"],
                popular: true
              },
              { 
                duration: "One Month", 
                price: "₹4,999", 
                deposit: "₹5,000", 
                features: ["30 days rental", "All accessories 20% off", "Dedicated support", "Free servicing"],
                popular: false
              }
            ].map((plan, index) => (
              <Card 
                key={index} 
                className={`relative hover:shadow-warm transition-all duration-300 ${
                  plan.popular ? 'border-primary shadow-warm scale-105' : 'border-primary/20'
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-gradient-primary text-primary-foreground px-4 py-1 rounded-full text-sm font-semibold">
                    Most Popular
                  </div>
                )}
                <CardContent className="pt-8 text-center">
                  <h3 className="text-2xl font-bold mb-2">{plan.duration}</h3>
                  <div className="text-4xl font-bold text-primary mb-2">{plan.price}</div>
                  <p className="text-sm text-muted-foreground mb-6">Deposit: {plan.deposit} (refundable)</p>
                  <ul className="space-y-3 mb-6">
                    {plan.features.map((feature, i) => (
                      <li key={i} className="flex items-center gap-2">
                        <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0" />
                        <span className="text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <Button asChild className="w-full bg-gradient-primary hover:opacity-90">
                    <Link to="/book">Select Plan</Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Accessories Showcase */}
      <section className="py-12 md:py-16 bg-muted/30">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-3 md:mb-4">Enhance Your Journey</h2>
          <p className="text-center text-muted-foreground mb-8 md:mb-12">Optional accessories to make your ride more memorable</p>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 max-w-6xl mx-auto">
            {[
              { name: "Meta Ray-Ban Glasses", price: "₹1,200/day", icon: Shield },
              { name: "GoPro Camera", price: "₹700/day", icon: Camera },
              { name: "Smart Helmet", price: "₹200/day", icon: Shield },
              { name: "Pump & Tools", price: "₹80/day", icon: Wrench }
            ].map((accessory, index) => (
              <Card key={index} className="hover:shadow-warm transition-all duration-300 border-primary/10">
                <CardContent className="pt-6 text-center">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
                    <accessory.icon className="w-8 h-8 text-primary" />
                  </div>
                  <h3 className="font-semibold mb-2">{accessory.name}</h3>
                  <p className="text-primary font-bold">{accessory.price}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Kashi Experience Section */}
      <section className="py-12 md:py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center px-4">
            <h2 className="text-3xl md:text-4xl font-bold mb-4 md:mb-6">Navigate Ancient Kashi, Sustainably</h2>
            <p className="text-base md:text-lg text-muted-foreground mb-6 md:mb-8">
              From the sacred ghats along the Ganga to the bustling lanes of ancient temples, 
              experience Varanasi's spiritual heritage on our eco-friendly electric bicycles. 
              Move freely through the narrow galis while respecting the sanctity of this timeless city.
            </p>
            <Button asChild size="lg" className="bg-gradient-primary hover:opacity-90">
              <Link to="/book">Start Your Journey</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-secondary text-secondary-foreground py-8 mt-16">
        <div className="container mx-auto px-4 text-center">
          <p className="mb-2">Bolt91 - By BlueBolt Electrical Pvt Ltd</p>
          <p className="text-sm text-secondary-foreground/70 mt-4">
            © 2025 Bolt91. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Home;
