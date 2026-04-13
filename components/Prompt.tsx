import {
	BulbOutlined,
	CheckCircleOutlined,
	InfoCircleOutlined,
} from '@ant-design/icons';
import { Prompts } from '@ant-design/x';
import type { PromptsProps } from '@ant-design/x';

const promptItems: PromptsProps['items'] = [
	{
		key: '1',
		icon: <BulbOutlined style={{ color: '#FFD700' }} />,
		description: 'Find the best available USDC vault on Base',
	},
	{
		key: '2',
		icon: <InfoCircleOutlined style={{ color: '#1890FF' }} />,
		description:
			'Go ahead and deposit 0.1 USDC into the best available USDC vault on Base',
	},
	{
		key: '3',
		icon: <CheckCircleOutlined style={{ color: '#52C41A' }} />,
		description: 'Deposit 5 USDC into the safest vault on Arbitrum',
	},
	{
		key: '4',
		icon: <InfoCircleOutlined style={{ color: '#722ED1' }} />,
		description: 'Move 10 USDC from Base into the best USDC vault on Arbitrum',
	},
];

interface PromptProps {
	onItemClick?: (prompt: string) => void;
}

const Prompt = ({ onItemClick }: PromptProps) => (
	<div className='flex items-center justify-center flex-1'>
		<div className='w-full'>
			<Prompts
				title='Ask the LI.FI Agent:'
				items={promptItems}
				wrap
				onItemClick={({ data }) => {
					if (onItemClick && data?.description) {
						onItemClick(String(data.description));
					}
				}}
			/>
		</div>
	</div>
);

export default Prompt;
