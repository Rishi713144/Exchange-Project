export type DbMessage = {
    type: "TRADE_ADDED",
    data: {
        id: string,
        isBuyerMaker: boolean,
        price: string,
        quantity: string,
        quoteQuantity: string,
        timestamp: number,
        market: string
    }
} | {
    type: "ORDER_UPDATE",
    data: {
        orderId: string,
        executedQty: number,
        market: string,
        price: string,
        quantity: string,
        side: "buy" | "sell",
        userId: string,
        status: "open" | "partially_filled" | "filled" | "cancelled" | "expired",
        timestamp: number,
    }
}
