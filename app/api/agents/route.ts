/**
 * API Route: POST /api/agents
 * 涓诲叆鍙ｇ偣锛屾帴鏀剁敤鎴锋秷鎭苟璋冪敤 MainAgent
 */

import { NextRequest, NextResponse } from 'next/server';
import { normalizeAgentRequest } from '@/lib/agentRuntime';
import { mainAgentStream } from './agents/main';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
	try {
		const body = await request.json();
		const normalizedRequest = normalizeAgentRequest(body);

		if (!normalizedRequest.ok) {
			return NextResponse.json(
				{
					success: false,
					error: normalizedRequest.error,
				},
				{ status: 400 },
			);
		}

		const { message, userAddress, chainId } = normalizedRequest.value;
		const encoder = new TextEncoder();

		const stream = new ReadableStream({
			start: async (controller) => {
				const send = (payload: unknown) => {
					controller.enqueue(
						encoder.encode(`data: ${JSON.stringify(payload)}\n\n`),
					);
				};

				try {
					for await (const chunk of mainAgentStream({
						userMessage: message,
						userAddress,
						chainId,
					})) {
						send(chunk);
					}
				} catch (error) {
					const errorMsg =
						error instanceof Error ? error.message : 'Unknown error';
					send({ type: 'error', content: errorMsg });
				} finally {
					controller.close();
				}
			},
		});

		return new Response(stream, {
			headers: {
				'Content-Type': 'text/event-stream; charset=utf-8',
				'Cache-Control': 'no-cache, no-transform',
				Connection: 'keep-alive',
				'X-Accel-Buffering': 'no',
			},
		});
	} catch (error) {
		console.error('Agent API error:', error);

		const errorMsg = error instanceof Error ? error.message : 'Unknown error';
		return NextResponse.json(
			{
				success: false,
				error: errorMsg,
			},
			{ status: 500 },
		);
	}
}

// GET for health check
export async function GET() {
	return NextResponse.json({
		status: 'ok',
		message: 'Agent API is running',
		supportedIntents: ['earn', 'bridge', 'monitor'],
		version: '1.0.0',
	});
}
