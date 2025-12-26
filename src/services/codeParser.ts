import { GraphData } from '../entities/VariableNode';
import { ProjectParser } from './parser/ProjectParser.ts';

export const parseVueCode = (files: Record<string, string>, entryFile: string): GraphData => {
    const parser = new ProjectParser(files);
    return parser.parseProject(entryFile);
};
