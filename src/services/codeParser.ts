import { GraphData } from '../entities/VariableNode';
import { parseProject as parseProjectFunctional } from './parser/parseProject';

export const parseProject = (files: Record<string, string>, entryFile: string): GraphData => {
    return parseProjectFunctional(files, entryFile);
};
