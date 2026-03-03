'use client';

import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { ordersApi } from '@/lib/api/orders';
import { quotesApi } from '@/lib/api/quotes';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Package, FileText, Clock, AlertCircle, ArrowRight } from 'lucide-react';

const STATUS_VARIANTS: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
    Draft: 'outline', Submitted: 'secondary', InReview: 'secondary',
    Approved: 'default', InProduction: 'default', Printing: 'default',
    PostProcessing: 'default', QualityCheck: 'default', Packaging: 'default',
    Shipped: 'default', Delivered: 'default', Completed: 'default',
    Cancelled: 'destructive', OnHold: 'secondary', QuoteProvided: 'secondary',
};

const QUOTE_STATUS_VARIANTS: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
    Pending: 'outline', UnderReview: 'secondary', QuoteProvided: 'default',
    Accepted: 'default', Expired: 'destructive', Cancelled: 'destructive',
};

function formatDate(d: string) {
    return new Date(d).toLocaleDateString('en-US', {
        month: 'short', day: 'numeric', year: 'numeric',
    });
}

export default function AdminDashboardPage() {
    const router = useRouter();

    const { data: recentOrdersData, isLoading: ordersLoading } = useQuery({
        queryKey: ['admin', 'orders', 'recent'],
        queryFn: () => ordersApi.getRecent(10),
    });

    const { data: pendingQuotesData, isLoading: quotesLoading } = useQuery({
        queryKey: ['admin', 'quotes', 'pending'],
        queryFn: () => quotesApi.getPending(1, 50),
    });

    const recentOrders = recentOrdersData?.data ?? [];
    const pendingQuotes = pendingQuotesData?.data.items ?? [];

    // Derive counts from recent orders
    const orderCounts = recentOrders.reduce((acc, order) => {
        acc[order.status] = (acc[order.status] ?? 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    const needsAttention = (orderCounts['Submitted'] ?? 0) +
        (orderCounts['InReview'] ?? 0) +
        (orderCounts['QualityCheck'] ?? 0);

    const inProgress = (orderCounts['InProduction'] ?? 0) +
        (orderCounts['Printing'] ?? 0) +
        (orderCounts['PostProcessing'] ?? 0) +
        (orderCounts['Packaging'] ?? 0);

    return (
        <div className="p-6 space-y-6">
            <div>
                <h1 className="text-2xl font-bold">Dashboard</h1>
                <p className="text-muted-foreground text-sm mt-1">
                    Welcome back — here&apos;s what needs your attention today.
                </p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card
                    className="cursor-pointer hover:bg-muted/30 transition-colors"
                    onClick={() => router.push('/admin/orders')}
                >
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                            <AlertCircle className="h-4 w-4" /> Needs Attention
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-3xl font-bold">{ordersLoading ? '—' : needsAttention}</p>
                        <p className="text-xs text-muted-foreground mt-1">Submitted, In Review, Quality Check</p>
                    </CardContent>
                </Card>

                <Card
                    className="cursor-pointer hover:bg-muted/30 transition-colors"
                    onClick={() => router.push('/admin/orders')}
                >
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                            <Clock className="h-4 w-4" /> In Progress
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-3xl font-bold">{ordersLoading ? '—' : inProgress}</p>
                        <p className="text-xs text-muted-foreground mt-1">Production, Printing, Packaging</p>
                    </CardContent>
                </Card>

                <Card
                    className="cursor-pointer hover:bg-muted/30 transition-colors"
                    onClick={() => router.push('/admin/quotes')}
                >
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                            <FileText className="h-4 w-4" /> Pending Quotes
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-3xl font-bold">{quotesLoading ? '—' : pendingQuotes.length}</p>
                        <p className="text-xs text-muted-foreground mt-1">Awaiting response</p>
                    </CardContent>
                </Card>
            </div>

            {/* Recent orders + Pending quotes side by side */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                {/* Recent Orders */}
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-3">
                        <CardTitle className="text-base flex items-center gap-2">
                            <Package className="h-4 w-4" />
                            Recent Orders
                        </CardTitle>
                        <Button
                            variant="ghost"
                            size="sm"
                            className="gap-1 text-xs"
                            onClick={() => router.push('/admin/orders')}
                        >
                            View all <ArrowRight className="h-3 w-3" />
                        </Button>
                    </CardHeader>
                    <CardContent className="p-0">
                        {ordersLoading ? (
                            <div className="p-4 space-y-3">
                                {[...Array(5)].map((_, i) => (
                                    <div key={i} className="h-10 bg-muted animate-pulse rounded" />
                                ))}
                            </div>
                        ) : recentOrders.length === 0 ? (
                            <p className="p-4 text-sm text-muted-foreground">No recent orders.</p>
                        ) : (
                            <div className="divide-y">
                                {recentOrders.map((order) => (
                                    <div
                                        key={order.id}
                                        className="flex items-center justify-between px-6 py-3 hover:bg-muted/30 cursor-pointer text-sm"
                                        onClick={() => router.push(`/admin/orders/${order.id}`)}
                                    >
                                        <div>
                                            <p className="font-medium">{order.orderNumber}</p>
                                            <p className="text-xs text-muted-foreground">
                                                {order.user?.firstName} {order.user?.lastName} · {formatDate(order.createdAt)}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <span className="font-medium">${order.totalPrice.toFixed(2)}</span>
                                            <Badge variant={STATUS_VARIANTS[order.status] ?? 'outline'} className="text-xs">
                                                {order.status}
                                            </Badge>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Pending Quotes */}
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-3">
                        <CardTitle className="text-base flex items-center gap-2">
                            <FileText className="h-4 w-4" />
                            Pending Quotes
                        </CardTitle>
                        <Button
                            variant="ghost"
                            size="sm"
                            className="gap-1 text-xs"
                            onClick={() => router.push('/admin/quotes')}
                        >
                            View all <ArrowRight className="h-3 w-3" />
                        </Button>
                    </CardHeader>
                    <CardContent className="p-0">
                        {quotesLoading ? (
                            <div className="p-4 space-y-3">
                                {[...Array(5)].map((_, i) => (
                                    <div key={i} className="h-10 bg-muted animate-pulse rounded" />
                                ))}
                            </div>
                        ) : pendingQuotes.length === 0 ? (
                            <p className="p-4 text-sm text-muted-foreground">No pending quotes.</p>
                        ) : (
                            <div className="divide-y">
                                {pendingQuotes.slice(0, 8).map((quote) => (
                                    <div
                                        key={quote.id}
                                        className="flex items-center justify-between px-6 py-3 hover:bg-muted/30 cursor-pointer text-sm"
                                        onClick={() => router.push(`/admin/quotes/${quote.id}`)}
                                    >
                                        <div>
                                            <p className="font-medium">{quote.requestNumber}</p>
                                            <p className="text-xs text-muted-foreground">
                                                {quote.file?.originalFileName ?? 'No file'} · {formatDate(quote.createdAt)}
                                            </p>
                                        </div>
                                        <Badge variant={QUOTE_STATUS_VARIANTS[quote.status] ?? 'outline'} className="text-xs">
                                            {quote.status}
                                        </Badge>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}