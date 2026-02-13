import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/Table';

interface TopInfluencer {
  id: string;
  name: string;
  sales: number;
  commissions: number;
  couponsUsed: number;
}

interface TopInfluencersTableProps {
  influencers: TopInfluencer[];
  loading: boolean;
}

export function TopInfluencersTable({
  influencers,
  loading,
}: TopInfluencersTableProps) {
  if (loading) {
    return (
      <div className="bg-white rounded-lg border p-6">
        <div className="text-lg font-semibold mb-4">Top Influencers</div>
        <div className="h-40 flex items-center justify-center text-gray-500">
          Carregando...
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border p-6">
      <div className="text-lg font-semibold mb-4">Top 10 Influencers</div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nome</TableHead>
            <TableHead className="text-right">Vendas</TableHead>
            <TableHead className="text-right">Comissões</TableHead>
            <TableHead className="text-right">Cupões Usados</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {influencers.length === 0 ? (
            <TableRow>
              <TableCell colSpan={4} className="text-center text-gray-500">
                Sem dados
              </TableCell>
            </TableRow>
          ) : (
            influencers.map((influencer) => (
              <TableRow key={influencer.id}>
                <TableCell className="font-medium">{influencer.name}</TableCell>
                <TableCell className="text-right">
                  €{influencer.sales.toFixed(2)}
                </TableCell>
                <TableCell className="text-right">
                  €{influencer.commissions.toFixed(2)}
                </TableCell>
                <TableCell className="text-right">
                  {influencer.couponsUsed}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
