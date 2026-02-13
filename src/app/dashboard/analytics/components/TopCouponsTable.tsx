import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/Table';

interface TopCoupon {
  code: string;
  influencerName: string;
  usageCount: number;
  totalSales: number;
  commissionTotal: number;
}

interface TopCouponsTableProps {
  coupons: TopCoupon[];
  loading: boolean;
}

export function TopCouponsTable({ coupons, loading }: TopCouponsTableProps) {
  if (loading) {
    return (
      <div className="bg-white rounded-lg border p-6">
        <div className="text-lg font-semibold mb-4">Top Cupões</div>
        <div className="h-40 flex items-center justify-center text-gray-500">
          Carregando...
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border p-6">
      <div className="text-lg font-semibold mb-4">Top 10 Cupões</div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Código</TableHead>
            <TableHead>Influencer</TableHead>
            <TableHead className="text-right">Usos</TableHead>
            <TableHead className="text-right">Total Vendas</TableHead>
            <TableHead className="text-right">Comissões</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {coupons.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="text-center text-gray-500">
                Sem dados
              </TableCell>
            </TableRow>
          ) : (
            coupons.map((coupon) => (
              <TableRow key={coupon.code}>
                <TableCell className="font-mono font-bold">
                  {coupon.code}
                </TableCell>
                <TableCell>{coupon.influencerName}</TableCell>
                <TableCell className="text-right">
                  {coupon.usageCount}
                </TableCell>
                <TableCell className="text-right">
                  €{coupon.totalSales.toFixed(2)}
                </TableCell>
                <TableCell className="text-right">
                  €{coupon.commissionTotal.toFixed(2)}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
