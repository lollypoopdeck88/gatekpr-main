import { motion, type Easing } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, Sparkles, ArrowRight, Mail } from "lucide-react";
import { Link } from "react-router-dom";

const easeOut: Easing = [0.16, 1, 0.3, 1];

const fadeInUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: easeOut } },
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2,
    },
  },
};

export function PricingSection() {
  return (
    <section id="pricing" className="py-20 px-4 sm:px-6 lg:px-8 bg-muted/30">
      <div className="max-w-5xl mx-auto">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={fadeInUp}
          className="text-center mb-12"
        >
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
            Simple, Transparent Pricing
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            One plan. All features. No hidden fees or per-resident charges.
          </p>
        </motion.div>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
          variants={staggerContainer}
          className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto"
        >
          {/* Launch Pricing */}
          <motion.div variants={fadeInUp}>
            <Card className="border-2 border-secondary relative overflow-hidden h-full">
              <div className="absolute top-0 left-0 right-0 bg-secondary text-secondary-foreground text-center py-2 text-sm font-semibold">
                <Sparkles className="inline h-4 w-4 mr-1" />
                Launch Special — Limited Time
              </div>
              <CardContent className="p-8 pt-14">
                <div className="text-center mb-6">
                  <div className="flex items-baseline justify-center gap-1">
                    <span className="text-5xl font-bold text-foreground">$99</span>
                    <span className="text-muted-foreground">/month</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">
                    or <span className="font-semibold text-foreground">$999/year</span>{" "}
                    <span className="text-accent">(save $189)</span>
                  </p>
                </div>
                
                <ul className="space-y-3 mb-8">
                  {[
                    "All features included",
                    "Unlimited residents",
                    "Unlimited payments & documents",
                    "Email notifications",
                    "Priority onboarding support",
                    "Lock in this rate forever",
                  ].map((feature, i) => (
                    <li key={i} className="flex items-center gap-3 text-sm">
                      <CheckCircle className="h-4 w-4 text-accent flex-shrink-0" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                <Link to="/signup" className="block">
                  <Button size="lg" className="w-full bg-secondary hover:bg-secondary/90">
                    Get Started
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </motion.div>

          {/* Standard Pricing */}
          <motion.div variants={fadeInUp}>
            <Card className="border-2 h-full">
              <CardContent className="p-8">
                <div className="text-center mb-6">
                  <p className="text-sm text-muted-foreground mb-2">Standard Pricing</p>
                  <div className="flex items-baseline justify-center gap-1">
                    <span className="text-5xl font-bold text-foreground">$129</span>
                    <span className="text-muted-foreground">/month</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">
                    or <span className="font-semibold text-foreground">$1,299/year</span>{" "}
                    <span className="text-accent">(save $249)</span>
                  </p>
                </div>
                
                <ul className="space-y-3 mb-8">
                  {[
                    "All features included",
                    "Unlimited residents",
                    "Unlimited payments & documents",
                    "Email notifications",
                    "Onboarding assistance",
                  ].map((feature, i) => (
                    <li key={i} className="flex items-center gap-3 text-sm">
                      <CheckCircle className="h-4 w-4 text-accent flex-shrink-0" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                <Link to="/signup" className="block">
                  <Button size="lg" variant="outline" className="w-full">
                    Get Started
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>

        {/* Property Manager CTA */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={fadeInUp}
          className="mt-12 text-center"
        >
          <Card className="border-2 border-dashed max-w-2xl mx-auto">
            <CardContent className="p-6">
              <h3 className="font-semibold text-foreground mb-2">
                Managing Multiple HOAs?
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                Property management companies can get volume discounts for multi-HOA accounts.
              </p>
              <a href="mailto:hello@gatekpr.app?subject=Multi-HOA Pricing Inquiry">
                <Button variant="outline" size="sm">
                  <Mail className="h-4 w-4 mr-2" />
                  Inquire About Multi-HOA Discounts
                </Button>
              </a>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </section>
  );
}
