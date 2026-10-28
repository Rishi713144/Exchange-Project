
export const AskTable = ({ asks }: { asks: [string, string][] }) => {
    const relevantAsks = asks.slice(0, 15);
    relevantAsks.reverse();
    const asksWithTotal = relevantAsks.reduce<[string, string, number][]>((rows, [price, quantity]) => {
        const total = (rows[rows.length - 1]?.[2] ?? 0) + Number(quantity);
        return [...rows, [price, quantity, total]];
    }, []);
    const maxTotal = asksWithTotal[asksWithTotal.length - 1]?.[2] ?? 0;
    asksWithTotal.reverse();

    return <div>
        {asksWithTotal.map(([price, quantity, total]) => <Ask maxTotal={maxTotal} key={price} price={price} quantity={quantity} total={total} />)}
    </div>
}
function Ask({price, quantity, total, maxTotal}: {price: string, quantity: string, total: number, maxTotal: number}) {
    return <div
    style={{
        display: "flex",
        position: "relative",
        width: "100%",
        backgroundColor: "transparent",
        overflow: "hidden",
    }}
>
    <div
        style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: `${(100 * total) / maxTotal}%`,
        height: "100%",
        background: "rgba(228, 75, 68, 0.325)",
        transition: "width 0.3s ease-in-out",
        }}
    ></div>
    <div className="flex justify-between text-xs w-full">
        <div>
            {price}
        </div>
        <div>
            {quantity}
        </div>
        <div>
            {total?.toFixed(2)}
        </div>
    </div>
    </div>
}
