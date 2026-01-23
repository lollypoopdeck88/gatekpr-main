import { useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { GateKprLogo } from "@/components/ui/GateKprLogo";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const {
    signIn,
    user,
    isLoading: authLoading,
    isSuperAdmin,
    role,
  } = useAuth();
  const { toast } = useToast();

  if (authLoading) {
    return (
      <div className='flex min-h-screen items-center justify-center bg-background'>
        <Loader2 className='h-8 w-8 animate-spin text-secondary' />
      </div>
    );
  }

  if (user && role !== null) {
    return (
      <Navigate to={isSuperAdmin ? "/admin/super" : "/dashboard"} replace />
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const { error } = await signIn(email, password);

    if (error) {
      toast({
        title: "Login failed",
        description: error.message,
        variant: "destructive",
      });
    }

    setIsLoading(false);
  };

  return (
    <div className='flex min-h-screen items-center justify-center bg-background p-4'>
      <Card className='w-full max-w-md'>
        <CardHeader className='text-center'>
          <div className='flex justify-center mb-4'>
            <div className='flex items-center gap-2'>
              <GateKprLogo size='lg' />
              <span className='text-2xl font-bold text-foreground'>
                GateKpr
              </span>
            </div>
          </div>
          <CardTitle className='text-xl'>Welcome back</CardTitle>
          <CardDescription>Sign in to access your HOA portal</CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className='space-y-4'>
            <div className='space-y-2'>
              <Label htmlFor='email'>Email</Label>
              <Input
                id='email'
                type='email'
                placeholder='you@example.com'
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete='email'
              />
            </div>
            <div className='space-y-2'>
              <Label htmlFor='password'>Password</Label>
              <Input
                id='password'
                type='password'
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete='current-password'
              />
            </div>
          </CardContent>
          <CardFooter className='flex flex-col gap-4'>
            <Button type='submit' className='w-full' disabled={isLoading}>
              {isLoading && <Loader2 className='mr-2 h-4 w-4 animate-spin' />}
              Sign In
            </Button>
            <div className='flex flex-col items-center gap-2 text-sm'>
              <Link
                to='/forgot-password'
                className='text-secondary hover:underline'>
                Forgot password?
              </Link>
              <span className='text-muted-foreground'>
                Don't have an account?{" "}
                <Link to='/signup' className='text-secondary hover:underline'>
                  Sign up
                </Link>
              </span>
            </div>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
