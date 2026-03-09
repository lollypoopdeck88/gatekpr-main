import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { GateKprLogoFull } from "@/components/ui/GateKprLogo";
import {
  CreditCard,
  Users,
  FileText,
  Bell,
  BarChart3,
  CheckCircle,
  ArrowRight,
  Building2,
  Home,
  Wrench,
  TrendingUp,
  Smartphone,
  Shield,
  Zap,
  XCircle,
  PieChart,
  Landmark,
  Mail,
  Globe,
  UserCircle,
} from "lucide-react";
import { Link, Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import {
  motion,
  useInView,
  useScroll,
  useTransform,
  useMotionValueEvent,
  type Easing,
} from "framer-motion";
import { FoundersBanner } from "@/components/landing/FoundersBanner";
import { PricingSection } from "@/components/landing/PricingSection";

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

function AnimatedSection({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <motion.div
      ref={ref}
      initial="hidden"
      animate={isInView ? "visible" : "hidden"}
      variants={fadeInUp}
      className={className}>
      {children}
    </motion.div>
  );
}

export default function LandingPage() {
  const { user, isSuperAdmin, role, isLoading } = useAuth();
  const { scrollY } = useScroll();
  const [navVisible, setNavVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [navSolid, setNavSolid] = useState(false);

  useMotionValueEvent(scrollY, "change", (latest) => {
    if (latest < 100) {
      setNavVisible(true);
      setNavSolid(false);
    } else {
      setNavSolid(true);
      if (latest > lastScrollY && latest > 200) {
        setNavVisible(false);
      } else {
        setNavVisible(true);
      }
    }
    setLastScrollY(latest);
  });

  if (!isLoading && user && role !== null && isSuperAdmin) {
    return <Navigate to="/admin/super" replace />;
  }

  useMotionValueEvent(scrollY, "change", (latest) => {
    if (latest < 100) {
      setNavVisible(true);
      setNavSolid(false);
    } else {
      setNavSolid(true);
      if (latest > lastScrollY && latest > 200) {
        setNavVisible(false);
      } else {
        setNavVisible(true);
      }
    }
    setLastScrollY(latest);
  });

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      <FoundersBanner />

      {/* Navigation */}
      <motion.nav
        initial={{ y: -160, opacity: 0 }}
        animate={{
          y: navVisible ? 0 : -160,
          opacity: navVisible ? 1 : 0,
        }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        className={`fixed top-11 sm:top-10 left-0 right-0 z-50 backdrop-blur border-b transition-colors duration-300 ${
          navSolid ? "bg-background/98 shadow-sm" : "bg-background/80"
        }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <motion.div whileHover={{ scale: 1.02 }}>
              <GateKprLogoFull size="md" />
            </motion.div>
            <div className="hidden md:flex items-center gap-8">
              {[
                { label: "Features", href: "#features" },
                { label: "Who It's For", href: "#who-its-for" },
                { label: "Pricing", href: "#pricing" },
              ].map((item) => (
                <motion.a
                  key={item.label}
                  href={item.href}
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  whileHover={{ y: -2 }}>
                  {item.label}
                </motion.a>
              ))}
            </div>
            <div className="flex items-center gap-3">
              <Link to="/login">
                <Button variant="ghost" size="sm">
                  Sign In
                </Button>
              </Link>
              <Link to="/signup">
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Button size="sm" className="bg-secondary hover:bg-secondary/90">
                    Start Your Community
                  </Button>
                </motion.div>
              </Link>
            </div>
          </div>
        </div>
      </motion.nav>

      {/* ─── 1. HERO ─── */}
      <section className="pt-32 sm:pt-28 pb-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-4xl sm:text-5xl lg:text-6xl font-bold text-foreground leading-tight mb-6">
            The easiest way to{" "}
            <span className="text-secondary">run an HOA</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-lg sm:text-xl text-muted-foreground mb-10 max-w-2xl mx-auto">
            A modern platform that automates HOA finances, payments, and
            communication—for communities of any size.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to="/signup">
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button size="lg" className="bg-secondary hover:bg-secondary/90 text-lg px-8">
                  Start Your Community
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </motion.div>
            </Link>
            <motion.a href="#features" whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button size="lg" variant="outline" className="text-lg px-8">
                See How It Works
              </Button>
            </motion.a>
          </motion.div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.4 }}
            className="text-sm text-muted-foreground mt-6">
            No credit card required · Set up in minutes · Simple, transparent pricing
          </motion.p>
        </div>
      </section>

      {/* ─── 2. THE PROBLEM ─── */}
      <section className="py-20 bg-muted/40 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <AnimatedSection className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
              HOA management shouldn't be this hard
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Most communities are stuck with tools that weren't built for them.
            </p>
          </AnimatedSection>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-50px" }}
            variants={staggerContainer}
            className="grid sm:grid-cols-2 gap-6 max-w-3xl mx-auto">
            {[
              { icon: FileText, text: "Spreadsheets and manual bookkeeping" },
              { icon: BarChart3, text: "Confusing financial reports no one understands" },
              { icon: Wrench, text: "Outdated software built for rental properties" },
              { icon: XCircle, text: "Fragmented tools for payments, docs, and communication" },
            ].map((item, i) => (
              <motion.div
                key={i}
                variants={fadeInUp}
                className="flex items-center gap-4 p-4 rounded-xl bg-card border">
                <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                  <item.icon className="h-5 w-5 text-muted-foreground" />
                </div>
                <p className="text-sm text-foreground">{item.text}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ─── 3. THE SOLUTION ─── */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <AnimatedSection>
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
              One modern platform for your entire community
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-12">
              GateKpr replaces spreadsheets, outdated software, and fragmented tools
              with one clean platform that automates finances and keeps your community informed.
            </p>
          </AnimatedSection>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-50px" }}
            variants={staggerContainer}
            className="grid sm:grid-cols-3 gap-6">
            {[
              { icon: Landmark, title: "Financial Automation", desc: "Bank-connected reporting that runs itself" },
              { icon: CreditCard, title: "Payments & Dues", desc: "Online collection with automatic reminders" },
              { icon: Bell, title: "Communication", desc: "Announcements, documents, and notifications" },
            ].map((item, i) => (
              <motion.div key={i} variants={fadeInUp}>
                <Card className="border-2 hover:border-secondary/40 transition-all hover:shadow-lg h-full">
                  <CardContent className="p-6 text-center">
                    <div className="h-12 w-12 rounded-xl bg-secondary/10 flex items-center justify-center mx-auto mb-4">
                      <item.icon className="h-6 w-6 text-secondary" />
                    </div>
                    <h3 className="font-semibold text-foreground mb-2">{item.title}</h3>
                    <p className="text-sm text-muted-foreground">{item.desc}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ─── 4. AUTOMATED FINANCIAL REPORTING (Core Feature) ─── */}
      <section className="py-20 bg-secondary/5 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <AnimatedSection>
              <div className="inline-flex items-center gap-2 bg-secondary/10 text-secondary px-4 py-2 rounded-full text-sm font-medium mb-6">
                <TrendingUp className="h-4 w-4" />
                Core Feature
              </div>
              <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
                Automated financial reporting
              </h2>
              <p className="text-lg text-muted-foreground mb-6">
                GateKpr connects securely to your HOA bank account and automatically
                generates monthly, quarterly, and annual financial reports. Transactions sync
                so spending, receipts, and allocations stay organized—no manual bookkeeping required.
              </p>
              <ul className="space-y-3">
                {[
                  "Bank transactions sync automatically",
                  "Monthly, quarterly & annual reports generated for you",
                  "Categorized spending and allocations",
                  "Export-ready reports for board meetings and audits",
                  "No accounting degree needed",
                ].map((item, i) => (
                  <motion.li
                    key={i}
                    className="flex items-center gap-3 text-sm"
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.08 }}
                    viewport={{ once: true }}>
                    <CheckCircle className="h-4 w-4 text-secondary flex-shrink-0" />
                    <span>{item}</span>
                  </motion.li>
                ))}
              </ul>
            </AnimatedSection>

            {/* Financial report mockup */}
            <AnimatedSection>
              <Card className="border-2 overflow-hidden">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <p className="text-sm text-muted-foreground">Monthly Summary</p>
                      <p className="text-2xl font-bold text-foreground">March 2026</p>
                    </div>
                    <div className="h-10 w-10 rounded-lg bg-secondary/10 flex items-center justify-center">
                      <PieChart className="h-5 w-5 text-secondary" />
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between py-3 border-b">
                      <span className="text-sm text-muted-foreground">Total Income</span>
                      <span className="font-semibold text-foreground">$24,750.00</span>
                    </div>
                    <div className="flex items-center justify-between py-3 border-b">
                      <span className="text-sm text-muted-foreground">Total Expenses</span>
                      <span className="font-semibold text-foreground">$8,320.00</span>
                    </div>
                    <div className="flex items-center justify-between py-3 border-b">
                      <span className="text-sm text-muted-foreground">Net Balance</span>
                      <span className="font-bold text-secondary">$16,430.00</span>
                    </div>
                    <div className="pt-2">
                      <p className="text-xs text-muted-foreground mb-3">Top Categories</p>
                      <div className="space-y-2">
                        {[
                          { label: "Landscaping", pct: 38 },
                          { label: "Utilities", pct: 25 },
                          { label: "Insurance", pct: 22 },
                          { label: "Maintenance", pct: 15 },
                        ].map((cat) => (
                          <div key={cat.label} className="flex items-center gap-3">
                            <span className="text-xs text-muted-foreground w-24">{cat.label}</span>
                            <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                              <div
                                className="h-full bg-secondary/60 rounded-full"
                                style={{ width: `${cat.pct}%` }}
                              />
                            </div>
                            <span className="text-xs text-muted-foreground w-8 text-right">{cat.pct}%</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </AnimatedSection>
          </div>
        </div>
      </section>

      {/* ─── 5. COMPETITIVE ADVANTAGES ─── */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto">
          <AnimatedSection className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
              Why communities choose GateKpr
            </h2>
          </AnimatedSection>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-50px" }}
            variants={staggerContainer}
            className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: CreditCard,
                title: "Simple Pricing",
                desc: "Everything included out of the box. No hidden fees, no per-resident charges, no paying for features you'll never use.",
              },
              {
                icon: Home,
                title: "Built for HOAs",
                desc: "Purpose-built for homeowner communities—not repurposed rental property software. Simpler workflows, better results.",
              },
              {
                icon: Zap,
                title: "No Feature Bloat",
                desc: "Only the tools your community actually needs: finances, reporting, payments, communication, and transparency.",
              },
              {
                icon: Smartphone,
                title: "Works Anywhere",
                desc: "Access from any web browser or mobile device. Residents, board members, and managers can use it anytime.",
              },
              {
                icon: Shield,
                title: "Modern & Secure",
                desc: "A clean, intuitive interface that feels like Stripe or Mercury—not outdated property management software.",
              },
              {
                icon: TrendingUp,
                title: "Financial Clarity",
                desc: "Automated reports, categorized spending, and dashboards that make HOA finances easy to understand.",
              },
            ].map((item, i) => (
              <motion.div key={i} variants={fadeInUp} whileHover={{ y: -4 }} transition={{ duration: 0.25 }}>
                <Card className="border hover:border-secondary/40 hover:shadow-lg transition-all duration-300 h-full">
                  <CardContent className="p-6">
                    <div className="h-10 w-10 rounded-lg bg-secondary/10 flex items-center justify-center mb-4">
                      <item.icon className="h-5 w-5 text-secondary" />
                    </div>
                    <h3 className="font-semibold text-foreground mb-2">{item.title}</h3>
                    <p className="text-sm text-muted-foreground">{item.desc}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ─── 6. KEY FEATURES ─── */}
      <section id="features" className="py-20 bg-muted/30 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto">
          <AnimatedSection className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
              Everything you need to run your HOA
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Core tools designed for HOA communities. Nothing unnecessary, nothing confusing.
            </p>
          </AnimatedSection>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-50px" }}
            variants={staggerContainer}
            className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                icon: BarChart3,
                title: "Automated Financial Reports",
                desc: "Monthly, quarterly, and annual reports generated from your bank transactions.",
              },
              {
                icon: Landmark,
                title: "Bank Integrations",
                desc: "Securely connect your HOA bank account. Transactions sync automatically.",
              },
              {
                icon: CreditCard,
                title: "Dues & Payment Tracking",
                desc: "Collect dues online via credit card or ACH with automatic reminders.",
              },
              {
                icon: Bell,
                title: "Resident Communication",
                desc: "Broadcast announcements with email notifications to keep everyone informed.",
              },
              {
                icon: FileText,
                title: "Document Sharing",
                desc: "Store and share bylaws, meeting minutes, budgets, and community rules.",
              },
              {
                icon: PieChart,
                title: "Financial Dashboards",
                desc: "Clear visualizations of income, expenses, and community financial health.",
              },
            ].map((feature, i) => (
              <motion.div key={i} variants={fadeInUp} whileHover={{ y: -4 }} transition={{ duration: 0.25 }}>
                <Card className="border-2 hover:border-secondary/40 hover:shadow-lg transition-all duration-300 h-full">
                  <CardContent className="p-6">
                    <div className="h-12 w-12 rounded-xl bg-secondary/10 flex items-center justify-center mb-4">
                      <feature.icon className="h-6 w-6 text-secondary" />
                    </div>
                    <h3 className="font-semibold text-lg text-foreground mb-2">{feature.title}</h3>
                    <p className="text-sm text-muted-foreground">{feature.desc}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ─── 7. WHO GATEKPR IS FOR ─── */}
      <section id="who-its-for" className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto">
          <AnimatedSection className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
              Built for every role in your community
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Whether you manage properties professionally, volunteer on a board,
              or just want to pay your dues—GateKpr works for you.
            </p>
          </AnimatedSection>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-50px" }}
            variants={staggerContainer}
            className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: Building2,
                title: "Property Managers",
                subtitle: "Manage multiple communities efficiently",
                benefits: [
                  "Centralized financial reporting",
                  "Automated bookkeeping across HOAs",
                  "Custom KPI metrics & drill-downs",
                  "Reduced administrative workload",
                ],
              },
              {
                icon: Home,
                title: "HOA Boards",
                subtitle: "Run your community like a pro—without hiring one",
                benefits: [
                  "Automated financial reports",
                  "Simplified dues management",
                  "Easy resident communication",
                  "Transparent financial dashboards",
                ],
              },
              {
                icon: UserCircle,
                title: "Residents",
                subtitle: "Visibility and convenience for homeowners",
                benefits: [
                  "Easy online dues payments",
                  "Access to financial summaries",
                  "Community announcements",
                  "Shared documents and updates",
                ],
              },
            ].map((persona, i) => (
              <motion.div key={i} variants={fadeInUp} whileHover={{ y: -4 }} transition={{ duration: 0.25 }}>
                <Card className="border-2 hover:border-secondary/40 hover:shadow-lg transition-all duration-300 h-full">
                  <CardContent className="p-6">
                    <div className="h-12 w-12 rounded-xl bg-secondary/10 flex items-center justify-center mb-4">
                      <persona.icon className="h-6 w-6 text-secondary" />
                    </div>
                    <h3 className="font-semibold text-lg text-foreground mb-1">{persona.title}</h3>
                    <p className="text-sm text-muted-foreground mb-4">{persona.subtitle}</p>
                    <ul className="space-y-2">
                      {persona.benefits.map((b, j) => (
                        <li key={j} className="flex items-center gap-2 text-sm">
                          <CheckCircle className="h-4 w-4 text-secondary flex-shrink-0" />
                          <span>{b}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ─── 8. TRUST & TRANSPARENCY ─── */}
      <section className="py-20 bg-muted/30 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto text-center">
          <AnimatedSection>
            <div className="h-14 w-14 rounded-2xl bg-secondary/10 flex items-center justify-center mx-auto mb-6">
              <Shield className="h-7 w-7 text-secondary" />
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
              Financial transparency builds trust
            </h2>
            <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
              When residents can see where their money goes, trust grows.
              GateKpr gives every board member and homeowner clear visibility
              into community finances—no more confusion, no more questions.
            </p>
            <div className="grid sm:grid-cols-3 gap-6">
              {[
                { label: "Clear dashboards", desc: "See income, expenses, and balances at a glance" },
                { label: "Categorized spending", desc: "Know exactly where every dollar goes" },
                { label: "Simplified reports", desc: "Financial summaries anyone can understand" },
              ].map((item, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                  viewport={{ once: true }}
                  className="p-4 rounded-xl bg-card border">
                  <p className="font-semibold text-foreground text-sm mb-1">{item.label}</p>
                  <p className="text-xs text-muted-foreground">{item.desc}</p>
                </motion.div>
              ))}
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* Pricing */}
      <PricingSection />

      {/* ─── 9. FINAL CTA ─── */}
      <section className="py-24 bg-primary px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto text-center">
          <AnimatedSection>
            <h2 className="text-3xl sm:text-4xl font-bold mb-4 text-primary-foreground">
              Run your HOA the modern way
            </h2>
            <p className="text-lg text-primary-foreground/90 mb-8 max-w-xl mx-auto">
              GateKpr simplifies finances, communication, and transparency
              for communities and property managers.
            </p>
            <Link to="/signup">
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="inline-block">
                <Button
                  size="lg"
                  className="bg-secondary text-secondary-foreground hover:bg-secondary/90 text-lg px-8">
                  Start Your Community
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </motion.div>
            </Link>
            <p className="text-sm text-primary-foreground/70 mt-4">
              No credit card required · Set up in minutes
            </p>
          </AnimatedSection>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-foreground py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="mb-4">
                <GateKprLogoFull size="md" />
              </div>
              <p className="text-sm text-background/80">
                Modern HOA management for communities that care.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4 text-background">Product</h4>
              <ul className="space-y-2 text-sm text-background/70">
                <li>
                  <a href="#features" className="hover:text-background transition-colors">
                    Features
                  </a>
                </li>
                <li>
                  <a href="#who-its-for" className="hover:text-background transition-colors">
                    Who It's For
                  </a>
                </li>
                <li>
                  <a href="#pricing" className="hover:text-background transition-colors">
                    Pricing
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4 text-background">Get Started</h4>
              <ul className="space-y-2 text-sm text-background/70">
                <li>
                  <Link to="/signup" className="hover:text-background transition-colors">
                    Start Your Community
                  </Link>
                </li>
                <li>
                  <Link to="/login" className="hover:text-background transition-colors">
                    Sign In
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4 text-background">Contact</h4>
              <ul className="space-y-2 text-sm text-background/70">
                <li className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  hello@gatekpr.app
                </li>
              </ul>
            </div>
          </motion.div>
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            viewport={{ once: true }}
            className="border-t border-background/20 pt-8 text-center text-sm text-background/70">
            <p>© {new Date().getFullYear()} GateKpr. All rights reserved.</p>
          </motion.div>
        </div>
      </footer>
    </div>
  );
}
