import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

interface TermsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const TermsDialog = ({ open, onOpenChange }: TermsDialogProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Blue Bolt Electric – Cycle Rental Agreement</DialogTitle>
          <DialogDescription>
            Click-Through Terms & Conditions (Version 1.0)
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="h-[60vh] pr-4">
          <div className="space-y-4 text-sm">
            <p className="text-muted-foreground">
              This Cycle Rental Agreement is a legally binding contract between the customer (Rider or You) and Blue Bolt Electric Pvt Ltd (Company or We). By clicking "I Agree", proceeding with payment, or taking possession of the rented cycle, you accept all terms below.
            </p>

            <section>
              <h3 className="font-semibold text-base mb-2">1. Eligibility, Identification and Company's Right to Refuse</h3>
              <ul className="list-none space-y-1 ml-4">
                <li>1.1 The Rider must be at least sixteen years of age.</li>
                <li>1.2 The Rider must provide a valid government-issued identity document before rental.</li>
                <li>1.3 Submission of an identity document does not guarantee approval of the rental.</li>
                <li>1.4 The Company may refuse, cancel or discontinue a rental at its sole discretion, even if all required documents have been submitted.</li>
                <li>1.5 The Company may verify or cross-check any details or documents provided by the Rider.</li>
              </ul>
            </section>

            <section>
              <h3 className="font-semibold text-base mb-2">2. Booking, Payment and Security Deposit</h3>
              <ul className="list-none space-y-1 ml-4">
                <li>2.1 All rental charges are payable in advance.</li>
                <li>2.2 A refundable security deposit must be paid at the time of handover through UPI or cash.</li>
                <li>2.3 The security deposit will be refunded within one hour of return of the cycle and successful completion of inspection.</li>
                <li>2.4 If inspection requires additional time due to operational reasons, the Company may extend the refund processing time reasonably.</li>
              </ul>
            </section>

            <section>
              <h3 className="font-semibold text-base mb-2">3. Company-Initiated Cancellations</h3>
              <ul className="list-none space-y-1 ml-4">
                <li>3.1 The Company may cancel a confirmed booking at any time before handover.</li>
                <li>3.2 If the Company cancels a booking, the Rider is entitled to a full refund of rental charges and the security deposit.</li>
                <li>3.3 The Company is not liable for any indirect or consequential loss arising from such cancellation.</li>
              </ul>
            </section>

            <section>
              <h3 className="font-semibold text-base mb-2">4. Use of the Cycle</h3>
              <ul className="list-none space-y-1 ml-4">
                <li>4.1 The Rider may use the cycle only within the Varanasi city limits unless written permission is provided by the Company.</li>
                <li>4.2 The Rider must comply with all traffic rules and safety regulations.</li>
                <li>4.3 The Rider shall not carry passengers, overload the cycle or use it for stunts or unsafe riding.</li>
                <li>4.4 The Rider shall not modify, alter, sub-rent or give the cycle to any third party.</li>
                <li>4.5 The Rider shall not engage in any activity that may damage the cycle or diminish its value.</li>
              </ul>
            </section>

            <section>
              <h3 className="font-semibold text-base mb-2">5. GPS Tracking and Tampering</h3>
              <ul className="list-none space-y-1 ml-4">
                <li>5.1 The cycle is equipped with a GPS tracking device for safety and recovery purposes.</li>
                <li>5.2 Any tampering, removal or attempted interference with the GPS device or its wiring will result in full forfeiture of the security deposit.</li>
                <li>5.3 The Company may initiate legal action in case of tampering or attempted tampering.</li>
              </ul>
            </section>

            <section>
              <h3 className="font-semibold text-base mb-2">6. Damage, Loss and Theft</h3>
              <ul className="list-none space-y-1 ml-4">
                <li>6.1 The Rider is fully responsible for the cycle during the rental period.</li>
                <li>6.2 Any repair or replacement costs arising from damage, loss or missing parts will be deducted from the security deposit.</li>
                <li>6.3 If repair or replacement costs exceed the deposit amount, the Rider must pay the remaining amount immediately.</li>
                <li>6.4 In case of theft, deliberate misuse or major damage, the Company may file a police complaint and initiate recovery proceedings.</li>
              </ul>
            </section>

            <section>
              <h3 className="font-semibold text-base mb-2">7. Return and Late Fees</h3>
              <ul className="list-none space-y-1 ml-4">
                <li>7.1 The Rider must return the cycle to an approved Blue Bolt Electric location.</li>
                <li>7.2 A grace period of one hour is allowed after the scheduled return time.</li>
                <li>7.3 Delay beyond one hour will attract a late fee equal to fifty percent of the daily rental rate.</li>
                <li>7.4 Failure to return the cycle within twenty-four hours without communication may be treated as unauthorised possession and reported to the authorities.</li>
              </ul>
            </section>

            <section>
              <h3 className="font-semibold text-base mb-2">8. Cancellations and Early Returns by Rider</h3>
              <ul className="list-none space-y-1 ml-4">
                <li>8.1 Bookings are non-refundable once confirmed, except where cancellation is made by the Company under Clause 3.</li>
                <li>8.2 No refund is provided for early return or unused rental duration.</li>
                <li>8.3 The Rider is not entitled to any adjustment or credit for partial use of the cycle.</li>
              </ul>
            </section>

            <section>
              <h3 className="font-semibold text-base mb-2">9. Helmet and Safety</h3>
              <ul className="list-none space-y-1 ml-4">
                <li>9.1 A helmet is provided to the Rider at no extra cost.</li>
                <li>9.2 The Rider is required to wear the helmet throughout the ride.</li>
                <li>9.3 Riding without a helmet is entirely at the Rider's own risk.</li>
              </ul>
            </section>

            <section>
              <h3 className="font-semibold text-base mb-2">10. Liability and Indemnity</h3>
              <ul className="list-none space-y-1 ml-4">
                <li>10.1 The Company is not liable for any accident, injury, death, third-party claim or damage arising during the rental period.</li>
                <li>10.2 The Rider agrees to indemnify and hold the Company harmless from all claims, liabilities, fines, penalties or losses arising from use of the cycle.</li>
              </ul>
            </section>

            <section>
              <h3 className="font-semibold text-base mb-2">11. Personal Data and Communication</h3>
              <ul className="list-none space-y-1 ml-4">
                <li>11.1 The Rider consents to the use of GPS data, ID verification information and operational data for safety and service delivery.</li>
                <li>11.2 The Rider agrees to receive transactional alerts, updates and safety messages from the Company.</li>
              </ul>
            </section>

            <section>
              <h3 className="font-semibold text-base mb-2">12. Governing Law and Jurisdiction</h3>
              <ul className="list-none space-y-1 ml-4">
                <li>12.1 This Agreement is governed by the laws of India.</li>
                <li>12.2 The courts of Varanasi, Uttar Pradesh shall have exclusive jurisdiction over all matters arising under this Agreement.</li>
              </ul>
            </section>

            <section>
              <h3 className="font-semibold text-base mb-2">13. Acceptance</h3>
              <ul className="list-none space-y-1 ml-4">
                <li>13.1 By clicking "I Agree", making payment or taking possession of the cycle, the Rider confirms full acceptance of all terms and conditions stated herein.</li>
              </ul>
            </section>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
