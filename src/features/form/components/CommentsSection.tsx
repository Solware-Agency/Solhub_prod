import { type Control } from 'react-hook-form'
import { type FormValues } from '@features/form/lib/form-schema'
import { FormField, FormItem, FormControl } from '@shared/components/ui/form'
import { Textarea } from '@shared/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@shared/components/ui/card'
import { memo } from 'react'

interface CommentsSectionProps {
	control: Control<FormValues>
	inputStyles: string
}

export const CommentsSection = memo(({ control, inputStyles }: CommentsSectionProps) => (
	<Card className="transition-transform duration-300 hover:border-primary hover:shadow-lg hover:shadow-primary/20">
		<CardHeader className="p-3 sm:p-4">
			<CardTitle className="text-base sm:text-lg">Comentarios</CardTitle>
		</CardHeader>
		<CardContent className="p-3 sm:p-4 pt-0 sm:pt-0">
			<FormField
				control={control}
				name="comments"
				render={({ field }) => (
					<FormItem>
						<FormControl>
							<Textarea
								placeholder="Añadir comentarios adicionales"
								className={`${inputStyles} min-h-[80px] sm:min-h-[100px]`}
								{...field}
							/>
						</FormControl>
					</FormItem>
				)}
			/>
		</CardContent>
	</Card>
))

CommentsSection.displayName = 'CommentsSection'