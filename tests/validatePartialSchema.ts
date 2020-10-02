import { Model } from 'mongoose';

const validatePartialSchema = async (model: typeof Model, mockCall: any): Promise<void> => {
    if (!mockCall || Array.isArray(mockCall) || typeof mockCall !== 'object')
        throw new Error('mockCall must be a valid object');

    const validKeys = [...Object.keys(model.schema.obj), '_id', '_v', 'id'];

    // Object contains keys not defined in Schema
    Object.keys(mockCall).forEach((key) => {
        if (!validKeys.includes(key)) throw new Error(`Call contains the invalid key "${key}"`);
    });

    // Object has values with invalid types
    await model.validate({ ...mockCall }, Object.keys(mockCall), (error) => {
        if (error) throw new Error(error);
    });
};

export default validatePartialSchema;
