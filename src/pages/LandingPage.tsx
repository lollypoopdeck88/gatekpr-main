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
  CalendarCheck,
  Download,
  Sparkles,
  QrCode,
  Smartphone,
  Settings,
  Share2,
  Mail,
  Eye,
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
import heroCommunity from "@/assets/hero-community.jpg";
import { FeatureShowcase } from "@/components/landing/FeatureShowcase";
import { FoundersBanner } from "@/components/landing/FoundersBanner";

// Easing function
const easeOut: Easing = [0.16, 1, 0.3, 1];

// Animation variants
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

const scaleIn = {
  hidden: { opacity: 0, scale: 0.9 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.5, ease: easeOut },
  },
};

const slideInLeft = {
  hidden: { opacity: 0, x: -50 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.6, ease: easeOut } },
};

const slideInRight = {
  hidden: { opacity: 0, x: 50 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.6, ease: easeOut } },
};

// Animated section wrapper
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
      initial='hidden'
      animate={isInView ? "visible" : "hidden"}
      variants={fadeInUp}
      className={className}>
      {children}
    </motion.div>
  );
}

// Hero Section with parallax effect
function HeroSection() {
  const heroRef = useRef(null);
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"],
  });

  const backgroundY = useTransform(scrollYProgress, [0, 1], ["0%", "30%"]);

  return (
    <section
      ref={heroRef}
      className='pt-24 pb-20 px-4 sm:px-6 lg:px-8 relative min-h-[600px] flex items-center overflow-hidden'>
      {/* Parallax Background Image */}
      <motion.div className='absolute inset-0 z-0' style={{ y: backgroundY }}>
        <img
          src={heroCommunity}
          alt='Beautiful gated community entrance with open gates'
          className='w-full h-[120%] object-cover'
        />
        {/* Whitewash gradient overlay for text readability */}
        <div className='absolute inset-0 bg-gradient-to-r from-background/95 via-background/85 to-background/40 lg:to-transparent' />
      </motion.div>

      <div className='max-w-7xl mx-auto relative z-10 w-full'>
        <div className='max-w-2xl'>
          {/* Text Content */}
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className='text-4xl sm:text-5xl lg:text-6xl font-bold text-foreground leading-tight mb-6'>
            Modern HOA Management,{" "}
            <motion.span
              className='text-secondary'
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4, delay: 0.3 }}>
              Simplified
            </motion.span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className='text-lg sm:text-xl text-muted-foreground mb-8 max-w-xl'>
            GateKpr helps self-managed HOAs and property management companies
            streamline payments, communications, and documents—all in one
            beautiful platform.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className='flex flex-col sm:flex-row items-start gap-4'>
            <Link to='/signup'>
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}>
                <Button
                  size='lg'
                  className='bg-secondary hover:bg-secondary/90 text-lg px-8'>
                  Get Started
                  <ArrowRight className='ml-2 h-5 w-5' />
                </Button>
              </motion.div>
            </Link>
            <motion.a
              href='#how-it-works'
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}>
              <Button
                size='lg'
                variant='outline'
                className='text-lg px-8 bg-background/80 backdrop-blur-sm'>
                See How It Works
              </Button>
            </motion.a>
          </motion.div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.4 }}
            className='text-sm text-muted-foreground mt-4'>
            Set up in minutes • Simple pricing based on community size
          </motion.p>
        </div>
      </div>
    </section>
  );
}

const features = [
  {
    icon: CreditCard,
    title: "Online Payments",
    description:
      "Accept dues via credit card or ACH. Residents pay in seconds with calendar reminders.",
    isNew: false,
  },
  {
    icon: Wrench,
    title: "Maintenance Requests",
    description:
      "Residents submit requests with real-time status tracking. Never lose a repair request again.",
    isNew: true,
  },
  {
    icon: CalendarCheck,
    title: "Space Reservations",
    description:
      "Book clubhouses, pools, and courts online. Add events to Google or Apple Calendar instantly.",
    isNew: true,
  },
  {
    icon: Download,
    title: "Financial Reports",
    description:
      "Export PDF and Excel reports for board meetings. Perfect for treasurers and audits.",
    isNew: true,
  },
  {
    icon: Bell,
    title: "Smart Notifications",
    description:
      "Automated email alerts for payments, requests, and approvals. SMS coming soon.",
    isNew: false,
  },
  {
    icon: Sparkles,
    title: "Guided Onboarding",
    description:
      "New residents get a personalized welcome tour with your custom HOA message.",
    isNew: true,
  },
  {
    icon: FileText,
    title: "Document Library",
    description:
      "Securely store and share bylaws, meeting minutes, rules, and important notices.",
    isNew: false,
  },
  {
    icon: Users,
    title: "Resident Directory",
    description:
      "Searchable directory helps neighbors connect. Privacy controls keep info safe.",
    isNew: false,
  },
  {
    icon: BarChart3,
    title: "Financial Tracking",
    description:
      "Track payments, outstanding balances, and generate comprehensive financial reports.",
    isNew: false,
  },
];

const whyGateKpr = [
  {
    icon: QrCode,
    title: "Instant Onboarding",
    description:
      "Share a QR code and residents join in seconds. Post it in your newsletter or common areas.",
  },
  {
    icon: Wrench,
    title: "Track Every Request",
    description:
      "Maintenance requests with real-time status updates keep everyone informed.",
  },
  {
    icon: Settings,
    title: "Use What You Need",
    description:
      "Start with payments and documents. Add violations, spaces, and more when you need them.",
  },
];

// How it works steps
const howItWorksSteps = [
  {
    step: 1,
    icon: CreditCard,
    title: "Create Your Account",
    description:
      "Sign up and explore the platform. See all the features available to your community.",
  },
  {
    step: 2,
    icon: Share2,
    title: "Share Your QR Code",
    description:
      "Get a unique QR code for your community. Print it, post it, share it anywhere.",
  },
  {
    step: 3,
    icon: Settings,
    title: "Set Up the Essentials",
    description:
      "Add payment schedules, upload documents, and connect your HOA bank account.",
  },
];

export default function LandingPage() {
  const { user, isSuperAdmin, role, isLoading } = useAuth();

  // Redirect authenticated super_admins to their admin dashboard
  if (!isLoading && user && role !== null && isSuperAdmin) {
    return <Navigate to='/admin/super' replace />;
  }

  const featuresRef = useRef(null);
  const featuresInView = useInView(featuresRef, {
    once: true,
    margin: "-100px",
  });

  // Track scroll for navbar animation
  const { scrollY } = useScroll();
  const [navVisible, setNavVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [navSolid, setNavSolid] = useState(false);

  useMotionValueEvent(scrollY, "change", (latest) => {
    // Show/hide based on scroll direction
    if (latest < 100) {
      setNavVisible(true);
      setNavSolid(false);
    } else {
      setNavSolid(true);
      if (latest > lastScrollY && latest > 200) {
        setNavVisible(false); // Scrolling down
      } else {
        setNavVisible(true); // Scrolling up
      }
    }
    setLastScrollY(latest);
  });

  return (
    <div className='min-h-screen bg-background overflow-x-hidden'>
      {/* Founders Launch Banner */}
      <FoundersBanner />
      
      {/* Navigation */}
      <motion.nav
        initial={{ y: -100, opacity: 0 }}
        animate={{
          y: navVisible ? 0 : -100,
          opacity: navVisible ? 1 : 0,
        }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        className={`fixed top-0 left-0 right-0 z-50 backdrop-blur border-b transition-colors duration-300 ${
          navSolid ? "bg-background/98 shadow-sm" : "bg-background/80"
        }`}>
        <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>
          <div className='flex items-center justify-between h-16'>
            <motion.div whileHover={{ scale: 1.02 }}>
              <GateKprLogoFull size='md' />
            </motion.div>
            <div className='hidden md:flex items-center gap-8'>
              {[
                { label: "Features", href: "#features" },
                { label: "How It Works", href: "#how-it-works" },
              ].map((item) => (
                <motion.a
                  key={item.label}
                  href={item.href}
                  className='text-sm text-muted-foreground hover:text-foreground transition-colors'
                  whileHover={{ y: -2 }}>
                  {item.label}
                </motion.a>
              ))}
            </div>
            <div className='flex items-center gap-3'>
              <Link to='/login'>
                <Button variant='ghost' size='sm'>
                  Sign In
                </Button>
              </Link>
              <Link to='/signup'>
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}>
                  <Button
                    size='sm'
                    className='bg-secondary hover:bg-secondary/90'>
                    Get Started
                  </Button>
                </motion.div>
              </Link>
            </div>
          </div>
        </div>
      </motion.nav>

      {/* Hero Section */}
      <HeroSection />

      {/* Interactive Feature Showcase */}
      <FeatureShowcase />

      <section className='py-16 px-4 sm:px-6 lg:px-8'>
        <div className='max-w-7xl mx-auto'>
          <motion.div
            initial='hidden'
            animate='visible'
            variants={staggerContainer}
            className='grid grid-cols-1 md:grid-cols-3 gap-8'>
            {whyGateKpr.map((item, index) => (
              <motion.div
                key={index}
                variants={scaleIn}
                whileHover={{ y: -4 }}
                transition={{ duration: 0.25 }}
                className='cursor-default'>
                <Card className='text-center border-2 hover:border-secondary/40 transition-all duration-300 hover:shadow-xl h-full overflow-hidden group'>
                  <CardContent className='pt-6 pb-6 relative'>
                    {/* Subtle gradient overlay on hover */}
                    <div className='absolute inset-0 bg-gradient-to-br from-secondary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300' />
                    <motion.div
                      className='h-14 w-14 rounded-2xl bg-secondary/10 flex items-center justify-center mx-auto mb-4 relative z-10 group-hover:bg-secondary/20 transition-colors duration-300'
                      whileHover={{ rotate: 5, scale: 1.1 }}>
                      <item.icon className='h-7 w-7 text-secondary group-hover:scale-110 transition-transform duration-300' />
                    </motion.div>
                    <h3 className='font-semibold text-foreground mb-2 relative z-10'>
                      {item.title}
                    </h3>
                    <p className='text-sm text-muted-foreground relative z-10'>
                      {item.description}
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Who We Serve */}
      <section className='py-20 bg-muted/50 px-4 sm:px-6 lg:px-8'>
        <div className='max-w-7xl mx-auto'>
          <AnimatedSection className='text-center mb-12'>
            <h2 className='text-3xl sm:text-4xl font-bold text-foreground mb-4'>
              Built for Communities Like Yours
            </h2>
            <p className='text-lg text-muted-foreground max-w-2xl mx-auto'>
              Whether you're a volunteer board member or managing multiple
              properties, GateKpr scales with you.
            </p>
          </AnimatedSection>

          <div className='grid md:grid-cols-2 gap-8 max-w-4xl mx-auto'>
            <AnimatedSection>
              <motion.div whileHover={{ y: -5 }} transition={{ duration: 0.2 }}>
                <Card className='border-2 hover:border-secondary/50 transition-all hover:shadow-lg h-full'>
                  <CardContent className='p-8'>
                    <motion.div
                      className='h-14 w-14 rounded-2xl bg-secondary/10 flex items-center justify-center mb-6'
                      whileHover={{ rotate: 5, scale: 1.1 }}>
                      <Home className='h-7 w-7 text-secondary' />
                    </motion.div>
                    <h3 className='text-xl font-bold text-foreground mb-3'>
                      Self-Managed HOAs
                    </h3>
                    <p className='text-muted-foreground mb-4'>
                      Volunteer board members juggling HOA duties with busy
                      lives. GateKpr automates the tedious stuff so you can
                      focus on building community.
                    </p>
                    <ul className='space-y-2'>
                      {[
                        "No accounting degree needed",
                        "Automatic payment reminders",
                        "Easy resident onboarding",
                      ].map((item, i) => (
                        <motion.li
                          key={item}
                          className='flex items-center gap-2 text-sm'
                          initial={{ opacity: 0, x: -20 }}
                          whileInView={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.1 }}
                          viewport={{ once: true }}>
                          <CheckCircle className='h-4 w-4 text-accent flex-shrink-0' />
                          <span>{item}</span>
                        </motion.li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              </motion.div>
            </AnimatedSection>

            <AnimatedSection>
              <motion.div whileHover={{ y: -5 }} transition={{ duration: 0.2 }}>
                <Card className='border-2 hover:border-secondary/50 transition-all hover:shadow-lg h-full'>
                  <CardContent className='p-8'>
                    <motion.div
                      className='h-14 w-14 rounded-2xl bg-secondary/10 flex items-center justify-center mb-6'
                      whileHover={{ rotate: -5, scale: 1.1 }}>
                      <Building2 className='h-7 w-7 text-secondary' />
                    </motion.div>
                    <h3 className='text-xl font-bold text-foreground mb-3'>
                      Property Management Companies
                    </h3>
                    <p className='text-muted-foreground mb-4'>
                      Managing multiple HOAs? Our Partner plan gives you a
                      unified dashboard with per-property pricing that scales.
                    </p>
                    <ul className='space-y-2'>
                      {[
                        "Multi-property dashboard",
                        "Bulk operations",
                        "Volume discounts available",
                      ].map((item, i) => (
                        <motion.li
                          key={item}
                          className='flex items-center gap-2 text-sm'
                          initial={{ opacity: 0, x: -20 }}
                          whileInView={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.1 }}
                          viewport={{ once: true }}>
                          <CheckCircle className='h-4 w-4 text-accent flex-shrink-0' />
                          <span>{item}</span>
                        </motion.li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              </motion.div>
            </AnimatedSection>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id='features' className='py-20 px-4 sm:px-6 lg:px-8'>
        <div className='max-w-7xl mx-auto'>
          <AnimatedSection className='text-center mb-16'>
            <div className='inline-flex items-center gap-2 bg-accent/10 text-accent px-4 py-2 rounded-full text-sm font-medium mb-4'>
              <Sparkles className='h-4 w-4' />
              New Features Added
            </div>
            <h2 className='text-3xl sm:text-4xl font-bold text-foreground mb-4'>
              Everything You Need to Run Your HOA
            </h2>
            <p className='text-lg text-muted-foreground max-w-2xl mx-auto'>
              From collecting dues to tracking maintenance requests, GateKpr
              handles it all with a clean, intuitive interface your residents
              will love.
            </p>
          </AnimatedSection>

          <motion.div
            ref={featuresRef}
            initial='hidden'
            animate={featuresInView ? "visible" : "hidden"}
            variants={staggerContainer}
            className='grid md:grid-cols-2 lg:grid-cols-3 gap-8'>
            {features.map((feature, index) => (
              <motion.div
                key={index}
                variants={fadeInUp}
                whileHover={{ y: -6 }}
                transition={{ duration: 0.25 }}
                className='cursor-default'>
                <Card className='group hover:shadow-xl transition-all duration-300 border-2 hover:border-secondary/40 h-full overflow-hidden relative'>
                  {feature.isNew && (
                    <div className='absolute top-3 right-3 z-20'>
                      <span className='inline-flex items-center gap-1 bg-accent text-accent-foreground text-xs font-bold px-2 py-1 rounded-full'>
                        NEW
                      </span>
                    </div>
                  )}
                  <CardContent className='p-6 relative'>
                    {/* Subtle shimmer effect on hover */}
                    <div className='absolute inset-0 bg-gradient-to-br from-secondary/5 via-transparent to-accent/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300' />
                    <motion.div
                      className='h-12 w-12 rounded-xl bg-secondary/10 flex items-center justify-center mb-4 group-hover:bg-secondary/20 transition-all duration-300 relative z-10'
                      whileHover={{ rotate: 8, scale: 1.05 }}>
                      <feature.icon className='h-6 w-6 text-secondary group-hover:scale-110 transition-transform duration-300' />
                    </motion.div>
                    <h3 className='text-lg font-semibold text-foreground mb-2 relative z-10 group-hover:text-secondary transition-colors duration-300'>
                      {feature.title}
                    </h3>
                    <p className='text-muted-foreground relative z-10'>
                      {feature.description}
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Competitor Pain Points - What We Solve */}
      <section className='py-16 px-4 sm:px-6 lg:px-8 bg-muted/30'>
        <div className='max-w-5xl mx-auto'>
          <AnimatedSection className='text-center mb-12'>
            <h2 className='text-2xl sm:text-3xl font-bold text-foreground mb-3'>
              Frustrated with Your Current HOA App?
            </h2>
            <p className='text-muted-foreground max-w-2xl mx-auto'>
              We've heard the complaints. Here's how GateKpr is different.
            </p>
          </AnimatedSection>

          <motion.div
            initial='hidden'
            whileInView='visible'
            viewport={{ once: true, margin: "-50px" }}
            variants={staggerContainer}
            className='grid md:grid-cols-2 gap-6'>
            {[
              {
                problem: '"I can never see the status of my service request"',
                solution:
                  "Real-time status tracking with notifications at every step—Open, In Progress, Resolved, Closed.",
              },
              {
                problem: '"The app crashes constantly and is unusable"',
                solution:
                  "Modern web app that works flawlessly on any device. No app store downloads required.",
              },
              {
                problem: '"I never get notified when things change"',
                solution:
                  "Automated email notifications for payments, maintenance updates, and reservation approvals.",
              },
              {
                problem: '"The reports are useless for board meetings"',
                solution:
                  "Export professional PDF and Excel financial reports with one click. Perfect for audits.",
              },
            ].map((item, index) => (
              <motion.div
                key={index}
                variants={fadeInUp}
                className='bg-card rounded-xl p-6 border shadow-sm'>
                <p className='text-sm text-destructive/80 italic mb-3 flex items-start gap-2'>
                  <span className='text-destructive text-lg leading-none'>
                    "
                  </span>
                  {item.problem.slice(1, -1)}
                </p>
                <div className='flex items-start gap-3'>
                  <CheckCircle className='h-5 w-5 text-accent flex-shrink-0 mt-0.5' />
                  <p className='text-sm text-foreground'>{item.solution}</p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Why Choose GateKpr Section */}
      <section className='py-20 bg-secondary px-4 sm:px-6 lg:px-8 overflow-hidden'>
        <div className='max-w-7xl mx-auto'>
          <AnimatedSection className='text-center mb-12'>
            <h2 className='text-3xl sm:text-4xl font-bold mb-4 text-secondary-foreground'>
              Why Choose GateKpr?
            </h2>
            <p className='text-lg text-secondary-foreground/90 max-w-2xl mx-auto'>
              We built GateKpr because we know running an HOA shouldn't feel
              like a second job. Here's what makes us different.
            </p>
          </AnimatedSection>

          <motion.div
            initial='hidden'
            whileInView='visible'
            viewport={{ once: true, margin: "-100px" }}
            variants={staggerContainer}
            className='grid md:grid-cols-3 gap-8 max-w-4xl mx-auto'>
            {[
              {
                title: "No Hidden Fees",
                desc: "Transparent pricing tailored to your community size. No surprises.",
              },
              {
                title: "Personalized Setup",
                desc: "Our team helps you import data and configure everything—at no extra cost.",
              },
              {
                title: "Built for Simplicity",
                desc: "Clean design that residents and board members actually enjoy using.",
              },
            ].map((item, index) => (
              <motion.div
                key={index}
                variants={fadeInUp}
                whileHover={{ y: -4 }}
                transition={{ duration: 0.25 }}
                className='cursor-default'>
                <Card className='bg-white/90 border-white h-full overflow-hidden group hover:bg-white transition-all duration-300 shadow-lg'>
                  <CardContent className='p-6 text-center relative'>
                    <motion.div
                      className='h-12 w-12 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-4 group-hover:bg-primary/30 transition-colors duration-300'
                      whileHover={{ scale: 1.1 }}>
                      <CheckCircle className='h-6 w-6 text-primary group-hover:scale-110 transition-transform duration-300' />
                    </motion.div>
                    <h3 className='font-semibold text-lg mb-2 text-foreground'>
                      {item.title}
                    </h3>
                    <p className='text-sm text-muted-foreground group-hover:text-foreground transition-colors duration-300'>
                      {item.desc}
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* How It Works Section */}
      <section
        id='how-it-works'
        className='py-20 bg-muted/50 px-4 sm:px-6 lg:px-8'>
        <div className='max-w-5xl mx-auto'>
          <AnimatedSection className='text-center mb-16'>
            <h2 className='text-3xl sm:text-4xl font-bold text-foreground mb-4'>
              Get Started in 3 Simple Steps
            </h2>
            <p className='text-lg text-muted-foreground max-w-2xl mx-auto'>
              No demos. No sales calls. Just sign up and start managing your
              community.
            </p>
          </AnimatedSection>

          <motion.div
            initial='hidden'
            whileInView='visible'
            viewport={{ once: true, margin: "-100px" }}
            variants={staggerContainer}
            className='grid md:grid-cols-3 gap-8'>
            {howItWorksSteps.map((step, index) => (
              <motion.div key={index} variants={fadeInUp} className='relative'>
                <Card className='border-2 hover:border-secondary/40 transition-all duration-300 hover:shadow-lg h-full'>
                  <CardContent className='p-6 text-center'>
                    <div className='absolute -top-4 left-1/2 -translate-x-1/2 h-8 w-8 rounded-full bg-secondary text-secondary-foreground flex items-center justify-center font-bold text-sm'>
                      {step.step}
                    </div>
                    <motion.div
                      className='h-14 w-14 rounded-2xl bg-secondary/10 flex items-center justify-center mx-auto mt-4 mb-4'
                      whileHover={{ rotate: 5, scale: 1.1 }}>
                      <step.icon className='h-7 w-7 text-secondary' />
                    </motion.div>
                    <h3 className='font-semibold text-lg text-foreground mb-2'>
                      {step.title}
                    </h3>
                    <p className='text-sm text-muted-foreground'>
                      {step.description}
                    </p>
                  </CardContent>
                </Card>
                {index < howItWorksSteps.length - 1 && (
                  <div className='hidden md:block absolute top-1/2 -right-4 transform -translate-y-1/2'>
                    <ArrowRight className='h-6 w-6 text-muted-foreground/40' />
                  </div>
                )}
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* App Download / QR Code Section */}
      <section className='py-20 px-4 sm:px-6 lg:px-8'>
        <div className='max-w-5xl mx-auto'>
          <div className='grid md:grid-cols-2 gap-12 items-center'>
            <AnimatedSection>
              <motion.div variants={slideInLeft}>
                <div className='inline-flex items-center gap-2 bg-accent/10 text-accent px-4 py-2 rounded-full text-sm font-medium mb-4'>
                  <Smartphone className='h-4 w-4' />
                  Works on Any Device
                </div>
                <h2 className='text-3xl sm:text-4xl font-bold text-foreground mb-4'>
                  Easy Resident Onboarding
                </h2>
                <p className='text-lg text-muted-foreground mb-6'>
                  Once your HOA is set up, share your unique QR code with
                  residents. They scan, sign up, and they're in. Post it on your
                  bulletin board, include it in newsletters, or share it on
                  social media.
                </p>
                <ul className='space-y-3 mb-8'>
                  {[
                    "Printable QR codes for easy distribution",
                    "No app store download required—works in browser",
                    "Residents join your community in under a minute",
                  ].map((item, i) => (
                    <motion.li
                      key={item}
                      className='flex items-center gap-3 text-foreground'
                      initial={{ opacity: 0, x: -20 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.1 }}
                      viewport={{ once: true }}>
                      <CheckCircle className='h-5 w-5 text-accent flex-shrink-0' />
                      <span>{item}</span>
                    </motion.li>
                  ))}
                </ul>
                <div className='flex flex-col sm:flex-row gap-3'>
                  <Link to='/signup'>
                    <Button
                      size='lg'
                      className='bg-secondary hover:bg-secondary/90'>
                      Create Your HOA
                      <ArrowRight className='ml-2 h-5 w-5' />
                    </Button>
                  </Link>
                </div>
              </motion.div>
            </AnimatedSection>

            <AnimatedSection>
              <motion.div
                variants={slideInRight}
                className='flex justify-center'>
                <Card className='border-2 max-w-sm w-full'>
                  <CardContent className='p-8 text-center'>
                    <div className='mb-4'>
                      <div className='h-48 w-48 mx-auto bg-muted rounded-xl flex items-center justify-center border-2 border-dashed border-muted-foreground/30'>
                        <QrCode className='h-24 w-24 text-muted-foreground/50' />
                      </div>
                    </div>
                    <h3 className='font-semibold text-foreground mb-2'>
                      Your Community QR Code
                    </h3>
                    <p className='text-sm text-muted-foreground mb-4'>
                      After signup, you'll get a unique QR code for your
                      community that residents can scan to join.
                    </p>
                    <div className='flex gap-2 justify-center'>
                      <Button variant='outline' size='sm' disabled>
                        <Download className='h-4 w-4 mr-2' />
                        Download PNG
                      </Button>
                      <Button variant='outline' size='sm' disabled>
                        <Share2 className='h-4 w-4 mr-2' />
                        Share
                      </Button>
                    </div>
                    <p className='text-xs text-muted-foreground mt-3'>
                      Available after creating your HOA
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            </AnimatedSection>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className='py-20 bg-secondary px-4 sm:px-6 lg:px-8'>
        <div className='max-w-3xl mx-auto text-center'>
          <AnimatedSection>
            <h2 className='text-3xl sm:text-4xl font-bold mb-4 text-secondary-foreground'>
              Ready to Simplify Your HOA?
            </h2>
            <p className='text-lg text-secondary-foreground/90 mb-8'>
              Join communities already using GateKpr to streamline payments,
              documents, and communication.
            </p>
            <Link to='/signup'>
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className='inline-block'>
                <Button
                  size='lg'
                  className='bg-white text-secondary hover:bg-white/90 text-lg px-8'>
                  Get Started
                  <ArrowRight className='ml-2 h-5 w-5' />
                </Button>
              </motion.div>
            </Link>
            <p className='text-sm text-secondary-foreground/70 mt-4'>
              Simple pricing based on community size • Set up in minutes
            </p>
          </AnimatedSection>
        </div>
      </section>

      {/* Footer */}
      <footer className='bg-foreground py-12 px-4 sm:px-6 lg:px-8'>
        <div className='max-w-7xl mx-auto'>
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className='grid md:grid-cols-4 gap-8 mb-8'>
            <div>
              <div className='mb-4'>
                <GateKprLogoFull size='md' />
              </div>
              <p className='text-sm text-background/80'>
                Modern HOA management for communities that care.
              </p>
            </div>
            <div>
              <h4 className='font-semibold mb-4 text-background'>Product</h4>
              <ul className='space-y-2 text-sm text-background/70'>
                <li>
                  <a
                    href='#how-it-works'
                    className='hover:text-background transition-colors'>
                    How It Works
                  </a>
                </li>
                <li>
                  <a
                    href='#features'
                    className='hover:text-background transition-colors'>
                    Features
                  </a>
                </li>
                <li>
                  <Link
                    to='/login'
                    className='hover:text-background transition-colors'>
                    Sign In
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h4 className='font-semibold mb-4 text-background'>
                Get Started
              </h4>
              <ul className='space-y-2 text-sm text-background/70'>
                <li>
                  <Link
                    to='/signup'
                    className='hover:text-background transition-colors'>
                    Create Your HOA
                  </Link>
                </li>
                <li>
                  <a
                    href='#'
                    className='hover:text-background transition-colors'>
                    Pricing
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h4 className='font-semibold mb-4 text-background'>Contact</h4>
              <ul className='space-y-2 text-sm text-background/70'>
                <li className='flex items-center gap-2'>
                  <Mail className='h-4 w-4' />
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
            className='border-t border-background/20 pt-8 text-center text-sm text-background/70'>
            <p>© {new Date().getFullYear()} GateKpr. All rights reserved.</p>
          </motion.div>
        </div>
      </footer>
    </div>
  );
}
