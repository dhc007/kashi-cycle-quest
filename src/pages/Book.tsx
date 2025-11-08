import { useState } from "react";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, Clock, Bike } from "lucide-react";

const Book = () => {
  const [step, setStep] = useState(1);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <div className="container mx-auto px-4 py-8">
        {/* Progress Indicator */}
        <div className="mb-8">
          <div className="flex items-center justify-center gap-4">
            {[
              { num: 1, label: "Select Date & Time" },
              { num: 2, label: "Choose Duration" },
              { num: 3, label: "Add Accessories" },
              { num: 4, label: "Checkout" },
              { num: 5, label: "Payment" }
            ].map((s) => (
              <div key={s.num} className="flex items-center gap-2">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${
                  step >= s.num 
                    ? 'bg-primary text-primary-foreground' 
                    : 'bg-muted text-muted-foreground'
                }`}>
                  {s.num}
                </div>
                <span className="hidden md:block text-sm">{s.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="max-w-4xl mx-auto">
          <Card className="shadow-warm">
            <CardHeader>
              <CardTitle className="text-2xl">Book Your Electric Bicycle</CardTitle>
            </CardHeader>
            <CardContent>
              {step === 1 && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      <Calendar className="w-5 h-5 text-primary" />
                      Select Pickup Date & Time
                    </h3>
                    <p className="text-muted-foreground mb-4">
                      Choose when you'd like to start your Kashi adventure
                    </p>
                    {/* Date/Time picker components will be added */}
                    <div className="border border-border rounded-lg p-4 text-center">
                      <p className="text-muted-foreground">Date & Time Picker Component</p>
                      <p className="text-sm text-muted-foreground mt-2">Operating Hours: 6:00 AM - 10:00 PM</p>
                    </div>
                  </div>

                  <Button 
                    onClick={() => setStep(2)}
                    className="w-full bg-gradient-primary hover:opacity-90"
                  >
                    Continue to Duration Selection
                  </Button>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      <Clock className="w-5 h-5 text-primary" />
                      Choose Rental Duration
                    </h3>
                    
                    <div className="grid md:grid-cols-3 gap-4">
                      {[
                        { duration: "One Day", price: "₹499", deposit: "₹2,000", hours: "24 hours" },
                        { duration: "One Week", price: "₹1,999", deposit: "₹2,000", hours: "168 hours" },
                        { duration: "One Month", price: "₹4,999", deposit: "₹5,000", hours: "30 days" }
                      ].map((option) => (
                        <Card 
                          key={option.duration}
                          className="cursor-pointer hover:border-primary hover:shadow-warm transition-all"
                        >
                          <CardContent className="pt-6 text-center">
                            <Bike className="w-12 h-12 mx-auto mb-3 text-primary" />
                            <h4 className="font-semibold mb-2">{option.duration}</h4>
                            <p className="text-2xl font-bold text-primary mb-1">{option.price}</p>
                            <p className="text-sm text-muted-foreground mb-2">{option.hours}</p>
                            <p className="text-xs text-muted-foreground">Deposit: {option.deposit}</p>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <Button variant="outline" onClick={() => setStep(1)} className="flex-1">
                      Back
                    </Button>
                    <Button onClick={() => setStep(3)} className="flex-1 bg-gradient-primary hover:opacity-90">
                      Continue to Accessories
                    </Button>
                  </div>
                </div>
              )}

              {step >= 3 && (
                <div className="text-center py-12">
                  <p className="text-muted-foreground">Additional booking steps will be implemented...</p>
                  <Button 
                    onClick={() => setStep(1)} 
                    className="mt-4 bg-gradient-primary hover:opacity-90"
                  >
                    Start Over
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Booking Summary Sidebar */}
          <Card className="mt-6 sticky top-20 shadow-warm border-primary/20">
            <CardHeader>
              <CardTitle>Booking Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Booking ID:</span>
                  <span className="font-mono font-semibold">BLT-{Date.now().toString().slice(-6)}</span>
                </div>
                <div className="border-t pt-3">
                  <p className="text-muted-foreground text-xs">Complete the booking to see full summary</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Book;
