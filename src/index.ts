#!/usr/bin/env node

import chalk from 'chalk';
import clear from 'clear';
import figlet from 'figlet';
import program from 'commander';

clear();
console.log(
    chalk.red(
        figlet.textSync('pizza-cli', { horizontalLayout: 'full' })
    )
);

program
    .version('0.0.1')
    .description('An example CLI for ordering pizzas')
    .option('-p, --peppers', "Add peppers")
    .option('-a, --anchovies', "Add anchovies")
    .option('-c, --cheese <type>', "Add cheese of type", "mozzarella")
    .option('-C, --no-cheese', "You do not want any cheese")
    .parse(process.argv);

console.log('you ordered a pizza with:');

if (program.peppers) console.log(' - peppers');
if (program.anchovies) console.log(' - anchovies');

const cheese: string = true === program.cheese ? 'mozzarella' : program.cheese || 'no';

console.log(' - %s cheese', cheese);

