'use client';

import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Building2,
  Calendar,
  ShoppingBag,
  Receipt,
  Users,
  FileText,
  CreditCard,
  ChevronRight,
} from 'lucide-react';

const settingsCategories = [
  { icon: Building2, label: 'Налаштування бізнесу', description: 'Вкажіть відомості про компанію, керуйте філіями' },
  { icon: Calendar, label: 'Планування', description: 'Налаштуйте розклад та онлайн-запис' },
  { icon: ShoppingBag, label: 'Продажі', description: 'Налаштуйте способи оплати, податки, чеки' },
  { icon: Receipt, label: 'Виставлення рахунків', description: 'Керуйте рахунками та платіжними даними' },
  { icon: Users, label: 'Команда', description: 'Керуйте дозволами, комісіями та відпустками' },
  { icon: FileText, label: 'Анкети', description: 'Налаштовуйте шаблони анкет' },
  { icon: CreditCard, label: 'Платежі', description: 'Налаштуйте способи оплати та термінали' },
];

export default function SetupPage() {
  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Налаштування робочого простору</h1>
        <p className="text-muted-foreground">Керуйте налаштуваннями для вашого закладу</p>
      </div>

      <Tabs defaultValue="settings">
        <TabsList className="mb-6">
          <TabsTrigger value="settings">Налаштування</TabsTrigger>
          <TabsTrigger value="online">Присутність в інтернеті</TabsTrigger>
          <TabsTrigger value="marketing">Маркетинг</TabsTrigger>
          <TabsTrigger value="other">Інше</TabsTrigger>
        </TabsList>

        <TabsContent value="settings">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {settingsCategories.map((category) => (
              <Card 
                key={category.label}
                className="p-4 hover:bg-muted/50 cursor-pointer transition-colors"
              >
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
            ))}
          </div>
        </TabsContent>

        <TabsContent value="online">
          <Card className="p-8 text-center text-muted-foreground">
            Налаштування присутності в інтернеті
          </Card>
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
