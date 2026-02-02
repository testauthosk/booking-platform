'use client';

import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Building2,
  Calendar,
  Users,
  FileText,
  ChevronRight,
} from 'lucide-react';
import Link from 'next/link';

const settingsCategories = [
  { icon: Building2, label: 'Налаштування бізнесу', description: 'Вкажіть відомості про компанію, керуйте філіями', href: '/setup/business' },
  { icon: Calendar, label: 'Планування', description: 'Налаштуйте розклад та онлайн-запис', href: '/setup/schedule' },
  { icon: Users, label: 'Команда', description: 'Керуйте дозволами, комісіями та відпустками', href: '/setup/team' },
  { icon: FileText, label: 'Анкети', description: 'Налаштовуйте шаблони анкет', href: '/setup/forms' },
];

export default function SetupPage() {
  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Налаштування робочого простору</h1>
        <p className="text-muted-foreground">Керуйте налаштуваннями для вашого закладу</p>
      </div>

      <Tabs defaultValue="settings">
        <div className="mb-6 overflow-x-auto scrollbar-hide -mx-6 px-6">
          <TabsList className="inline-flex w-auto min-w-full sm:min-w-0 h-10 p-1 gap-0">
            <TabsTrigger value="settings" className="flex-1 sm:flex-none px-4 rounded-md data-[state=active]:shadow-sm">
              Налаштування
            </TabsTrigger>
            <TabsTrigger value="marketing" className="flex-1 sm:flex-none px-4 rounded-md data-[state=active]:shadow-sm">
              Маркетинг
            </TabsTrigger>
            <TabsTrigger value="other" className="flex-1 sm:flex-none px-4 rounded-md data-[state=active]:shadow-sm">
              Інше
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="settings">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {settingsCategories.map((category) => (
              <Link key={category.label} href={category.href}>
                <Card className="p-4 hover:bg-muted/50 cursor-pointer transition-colors h-full">
                  <div className="flex items-start gap-4">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <category.icon className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">{category.label}</p>
                      <p className="text-sm text-muted-foreground">{category.description}</p>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="marketing">
          <Card className="p-8 text-center text-muted-foreground">
            Налаштування маркетингу
          </Card>
        </TabsContent>

        <TabsContent value="other">
          <Card className="p-8 text-center text-muted-foreground">
            Інші налаштування
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
