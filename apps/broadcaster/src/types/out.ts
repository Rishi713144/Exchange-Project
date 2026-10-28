export type TickerUpdateMessage = {
    stream: string,
    data: {
        c?: string,
        h?: string,
        l?: string,
        v?: string,
        V?: string,
        s?: string,
        fp?: string,
        pc?: string,
        pcp?: string,
        n?: number,
        id: number,
        e: "ticker"
    }
}

export type DepthUpdateMessage = {
    stream: string,
    data: {
        b?: [string, string][],
        a?: [string, string][],
        e: "depth"
    }
}

export type TradeAddedMessage = {
    stream: string,
    data: {
        e: "trade",
        t: number,
        m: boolean,
        p: string,
        q: string,
        s: string,
    }
}

export type FillUpdateMessage = {
    stream: string,
    data: {
        e: "fill",
        t: number,
        s: string,
        p: string,
        q: string,
        side: "buy" | "sell",
        o: string,
        m: boolean,
    }
}

export type OutgoingMessage = TickerUpdateMessage | DepthUpdateMessage | TradeAddedMessage | FillUpdateMessage;
