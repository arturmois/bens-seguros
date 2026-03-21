'use client';

import { Controller } from 'react-hook-form';
import { InputMask } from '@react-input/mask';

import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CEP_MASK, CNPJ_MASK } from '@/lib/masks';

import { CONSTRUCAO_OPTIONS, TIPO_IMOVEL_OPTIONS, USO_IMOVEL_OPTIONS } from '../lib/branch-options';
import { FieldWrapper } from './branch-field-sets';
import type { FieldHelperProps } from './branch-field-sets';

export function ResidentialFields({ register, control }: FieldHelperProps) {
  return (
    <>
      <FieldWrapper label="Tipo de Imovel" required>
        <Controller
          name="tipoImovel"
          control={control}
          render={({ field }) => (
            <Select
              value={String(field.value ?? '')}
              onValueChange={field.onChange}
              items={TIPO_IMOVEL_OPTIONS}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                {TIPO_IMOVEL_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
      </FieldWrapper>
      <FieldWrapper label="Uso do Imovel" required>
        <Controller
          name="usoImovel"
          control={control}
          render={({ field }) => (
            <Select
              value={String(field.value ?? '')}
              onValueChange={field.onChange}
              items={USO_IMOVEL_OPTIONS}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                {USO_IMOVEL_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
      </FieldWrapper>
      <FieldWrapper label="CEP" required>
        <Controller
          name="cep"
          control={control}
          render={({ field }) => (
            <InputMask
              component={Input}
              mask={CEP_MASK.mask}
              replacement={CEP_MASK.replacement}
              placeholder="00000-000"
              {...field}
              value={String(field.value ?? '')}
            />
          )}
        />
      </FieldWrapper>
      <FieldWrapper label="Endereco">
        <Input placeholder="Rua, numero, bairro" {...register('endereco')} />
      </FieldWrapper>
      <FieldWrapper label="Construcao">
        <Controller
          name="construcao"
          control={control}
          render={({ field }) => (
            <Select
              value={String(field.value ?? '')}
              onValueChange={field.onChange}
              items={CONSTRUCAO_OPTIONS}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                {CONSTRUCAO_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
      </FieldWrapper>
      <FieldWrapper label="Area (m2)">
        <Input
          type="number"
          placeholder="Ex: 120"
          {...register('areaM2', { valueAsNumber: true })}
        />
      </FieldWrapper>
    </>
  );
}

export function CondominiumFields({ register, control }: FieldHelperProps) {
  return (
    <>
      <FieldWrapper label="Nome do Condominio" required>
        <Input placeholder="Nome do condominio" {...register('nomeCondominio')} />
      </FieldWrapper>
      <FieldWrapper label="Numero de Unidades" required>
        <Input
          type="number"
          placeholder="Ex: 48"
          {...register('numeroUnidades', { valueAsNumber: true })}
        />
      </FieldWrapper>
      <FieldWrapper label="CEP" required>
        <Controller
          name="cep"
          control={control}
          render={({ field }) => (
            <InputMask
              component={Input}
              mask={CEP_MASK.mask}
              replacement={CEP_MASK.replacement}
              placeholder="00000-000"
              {...field}
              value={String(field.value ?? '')}
            />
          )}
        />
      </FieldWrapper>
      <FieldWrapper label="Endereco">
        <Input placeholder="Rua, numero, bairro" {...register('endereco')} />
      </FieldWrapper>
      <FieldWrapper label="Ano de Construcao">
        <Input
          type="number"
          placeholder="Ex: 2010"
          {...register('anoConstrucao', { valueAsNumber: true })}
        />
      </FieldWrapper>
      <FieldWrapper label="Numero de Andares">
        <Input
          type="number"
          placeholder="Ex: 12"
          {...register('numeroAndares', { valueAsNumber: true })}
        />
      </FieldWrapper>
    </>
  );
}

export function BusinessFields({ register, control }: FieldHelperProps) {
  return (
    <>
      <FieldWrapper label="Razao Social" required>
        <Input placeholder="Razao social da empresa" {...register('razaoSocial')} />
      </FieldWrapper>
      <FieldWrapper label="CNPJ" required>
        <Controller
          name="cnpj"
          control={control}
          render={({ field }) => (
            <InputMask
              component={Input}
              mask={CNPJ_MASK.mask}
              replacement={CNPJ_MASK.replacement}
              placeholder="00.000.000/0000-00"
              {...field}
              value={String(field.value ?? '')}
            />
          )}
        />
      </FieldWrapper>
      <FieldWrapper label="Atividade" required>
        <Input placeholder="Atividade principal" {...register('atividade')} />
      </FieldWrapper>
      <FieldWrapper label="CEP">
        <Controller
          name="cep"
          control={control}
          render={({ field }) => (
            <InputMask
              component={Input}
              mask={CEP_MASK.mask}
              replacement={CEP_MASK.replacement}
              placeholder="00000-000"
              {...field}
              value={String(field.value ?? '')}
            />
          )}
        />
      </FieldWrapper>
      <FieldWrapper label="Endereco">
        <Input placeholder="Rua, numero, bairro" {...register('endereco')} />
      </FieldWrapper>
      <FieldWrapper label="Area (m2)">
        <Input
          type="number"
          placeholder="Ex: 200"
          {...register('areaM2', { valueAsNumber: true })}
        />
      </FieldWrapper>
    </>
  );
}
