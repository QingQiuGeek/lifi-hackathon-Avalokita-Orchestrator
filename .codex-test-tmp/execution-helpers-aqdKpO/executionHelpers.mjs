import { encodeFunctionData, erc20Abi } from 'viem';
function sumGasAmount(gasCosts) {
    return (gasCosts ?? []).reduce((sum, cost) => {
        try {
            return sum + BigInt(cost.amount ?? '0');
        }
        catch {
            return sum;
        }
    }, BigInt(0));
}
export function runExecutionPreflight(input) {
    const quote = input.preview.quote;
    const amountBaseUnits = quote?.action?.fromAmount
        ? BigInt(quote.action.fromAmount)
        : null;
    const approvalAddress = quote?.estimate?.approvalAddress ?? null;
    if (input.preview.fromChain !== input.preview.toChain) {
        return {
            ready: false,
            reason: 'blocked_quote_failure',
            requiresApproval: false,
            allowanceSufficient: false,
            nativeGasSufficient: true,
            approvalAddress,
            amountBaseUnits,
        };
    }
    if (!quote?.transactionRequest?.to || !quote.transactionRequest?.data || !amountBaseUnits) {
        return {
            ready: false,
            reason: 'blocked_quote_failure',
            requiresApproval: false,
            allowanceSufficient: false,
            nativeGasSufficient: true,
            approvalAddress,
            amountBaseUnits,
        };
    }
    if (!input.wallet.address || input.wallet.chainId !== input.preview.fromChain) {
        return {
            ready: false,
            reason: 'blocked_wallet_context',
            requiresApproval: false,
            allowanceSufficient: false,
            nativeGasSufficient: true,
            approvalAddress,
            amountBaseUnits,
        };
    }
    if (!approvalAddress) {
        return {
            ready: false,
            reason: 'blocked_missing_approval_target',
            requiresApproval: false,
            allowanceSufficient: false,
            nativeGasSufficient: true,
            approvalAddress: null,
            amountBaseUnits,
        };
    }
    const estimatedGas = sumGasAmount(quote.estimate?.gasCosts);
    const nativeGasSufficient = input.wallet.nativeBalance >= estimatedGas;
    if (!nativeGasSufficient) {
        return {
            ready: false,
            reason: 'blocked_insufficient_gas',
            requiresApproval: false,
            allowanceSufficient: input.wallet.allowance >= amountBaseUnits,
            nativeGasSufficient: false,
            approvalAddress,
            amountBaseUnits,
        };
    }
    const allowanceSufficient = input.wallet.allowance >= amountBaseUnits;
    return {
        ready: true,
        reason: null,
        requiresApproval: !allowanceSufficient,
        allowanceSufficient,
        nativeGasSufficient: true,
        approvalAddress,
        amountBaseUnits,
    };
}
export function buildApproveRequest(input) {
    return {
        to: input.tokenAddress,
        value: BigInt(0),
        data: encodeFunctionData({
            abi: erc20Abi,
            functionName: 'approve',
            args: [input.spender, input.amount],
        }),
    };
}
