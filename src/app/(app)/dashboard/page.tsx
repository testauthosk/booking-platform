'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function DashboardPage() {
  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Головна панель</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Останні продажі */}
        <Card>
          <CardHeader>
            <CardTitle>Останні продажі</CardTitle>
            <p className="text-sm text-muted-foreground">Останні 7 днів</p>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">0 €</div>
            <p className="text-sm text-muted-foreground mt-2">
              Записів: 3 · Вартість візитів: 132 €
            </p>
          </CardContent>
        </Card>

        {/* Майбутні візити */}
        <Card>
          <CardHeader>
            <CardTitle>Майбутні візити</CardTitle>
            <p className="text-sm text-muted-foreground">Наступні 7 днів</p>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center h-32 text-muted-foreground">
              Ваш графік порожній
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Записи */}
      <Card>
        <CardHeader>
          <CardTitle>Записи</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <p className="font-medium">Стрижка</p>
                <p className="text-sm text-muted-foreground">John Doe · 1г 45хв</p>
              </div>
              <div className="text-sm text-muted-foreground">
                31 січ. 2026 11:00
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
